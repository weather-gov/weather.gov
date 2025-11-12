import json
import logging
import uuid
from collections import namedtuple
from datetime import datetime, timezone
from http import HTTPStatus
from io import BytesIO
from json.decoder import JSONDecodeError

from django.contrib.gis.geos import GEOSGeometry
from django.core.files import File
from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from backend.models import WFO

from .json import FakeDrupal
from .models import SituationReport, TemporaryImage, TemporaryPDF, WeatherStory
from .util import (
    basic_auth_required,
    get_filename_from_header,
    get_short_wfo_code,
    get_temporary_id,
)

logger = logging.getLogger(__name__)


@basic_auth_required()
@csrf_exempt
def pdf(request):
    """Receive a PDF file and store it."""
    original_filename = get_filename_from_header(request)
    uid, filename = get_temporary_id(original_filename, "pdf", "pdf")

    # write the file to S3 and make a record in the database
    wire = BytesIO(request.read())
    file = File(wire, name=filename)
    sitrep = TemporaryPDF(id=uid, file=file)
    sitrep.save()

    logger.info(
        "Received PDF '%s', saved it as '%s' with TemporaryPDF id of '%s'",
        original_filename,
        filename,
        sitrep.id,
    )

    # return the same JSON struct that Drupal used
    return FakeDrupal().file_upload(uid, original_filename)


@basic_auth_required()
@csrf_exempt
def situation_report(request):
    """Record having received the situation report in PDF format."""
    if request.method != "POST":
        return HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED)

    try:
        # parse and reformat the json data
        data = json.loads(request.body)
        logger.info("Received situation report: %s", data)
        attr = data["data"]["attributes"]

        wfo = get_short_wfo_code(code=attr["field_wfo_code"])
        title = attr["title"].strip().replace("\n", "")
        _id = uuid.UUID(data["data"]["relationships"]["field_wfo_sitrep"]["data"]["id"])

    except (JSONDecodeError, KeyError, ValueError, WFO.DoesNotExist):
        msg = "Data is malformed or WFO does not match our records"
        logger.error("Error while processing situation report:", exc_info=True)
        return HttpResponse(msg, status=HTTPStatus.BAD_REQUEST)

    # locate matching pdf (this should have been uploaded first)
    if not TemporaryPDF.objects.filter(id=_id).exists():
        logger.error("No PDF with id %s found for situation report request.", _id)
        return HttpResponse(status=HTTPStatus.PRECONDITION_FAILED)

    temp = TemporaryPDF.objects.get(id=_id)

    wire = BytesIO(temp.file.read())
    FilenameParts = namedtuple("FilenameParts", ["wfo", "orig_id", "curr_time"])
    p = FilenameParts(wfo.code, str(_id).replace("-", ""), int(datetime.now(tz=timezone.utc).timestamp()))
    filename = f"{p.wfo}_{p.curr_time}_{p.orig_id}.pdf"
    file = File(wire, name=filename)

    with transaction.atomic():
        sitrep = SituationReport(
            title=title,
            pdf=file,
            wfo=wfo,
        )
        sitrep.save()
        temp.delete()

    # keep bucket usage under control
    SituationReport.objects.prune(wfo)

    logger.info(
        "Saved situation report for %s as '%s' with Django SituationReport id of '%s'",
        wfo,
        filename,
        sitrep.id,
    )

    # return the same JSON struct that Drupal used
    return FakeDrupal().situation_report(data)


@basic_auth_required()
@csrf_exempt
def image(request, size):
    """Receive an image file and store it."""
    original_filename = get_filename_from_header(request)
    pre = "full" if size == "F" else "small"
    uid, filename = get_temporary_id(original_filename, pre, "png")

    # write the file to S3 and make a record in the database
    wire = BytesIO(request.read())
    file = File(wire, name=filename)
    wx_story = TemporaryImage(id=uid, image=file)
    wx_story.save()

    logger.info(
        "Received image '%s', saved it as '%s' with TemporaryImage id of '%s'",
        original_filename,
        filename,
        wx_story.id,
    )

    # return the same JSON struct that Drupal used
    return FakeDrupal().file_upload(uid, original_filename)


@basic_auth_required()
@csrf_exempt
def weather_story(request):
    """Record having received the weather story in image format."""
    if request.method != "POST":
        return HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED)

    try:
        # parse and reformat the json data
        data = json.loads(request.body)
        logger.info("Received weather story: %s", data)
        attr = data["data"]["attributes"]

        starttime = datetime.fromtimestamp(int(attr["field_starttime"]), tz=timezone.utc)
        endtime = datetime.fromtimestamp(int(attr["field_endtime"]), tz=timezone.utc)
        point = GEOSGeometry(f"POINT({attr['field_cwa_center_lon']} {attr['field_cwa_center_lat']})")
        wfo = get_short_wfo_code(code=attr["field_office"])
        title = attr["title"].strip().replace("\n", "")
        description = attr["field_description"].strip().replace("\n", "<br />")

        # create a tuple: images = (fullimage_id, [smallimage_id])
        rels = data["data"]["relationships"]
        images = (uuid.UUID(rels["field_fullimage"]["data"]["id"]),)
        if "field_smallimage" in rels:
            images += (uuid.UUID(rels["field_smallimage"]["data"]["id"]),)

    except (JSONDecodeError, KeyError, ValueError, WFO.DoesNotExist, WFO.MultipleObjectsReturned):
        msg = """
            Data is malformed or WFO does not match our records.
            Please send us the JSON by email so we can fix what went wrong.
            """
        logger.error("Error while processing weather story:", exc_info=True)
        return HttpResponse(msg, status=HTTPStatus.BAD_REQUEST)

    # locate matching images (these should have been uploaded first)
    for _id in images:
        if not TemporaryImage.objects.filter(id=_id).exists():
            msg = "We weren't able to find matching weather story images."
            logger.error("No image with id %s found for weather story request.", _id)
            return HttpResponse(msg, status=HTTPStatus.PRECONDITION_FAILED)

    files = tuple()
    temp = []
    for idx, _id in enumerate(images):
        temp.append(TemporaryImage.objects.get(id=_id))
        image = temp[-1].image
        wire = BytesIO(image.read())
        FilenameParts = namedtuple("FilenameParts", ["wfo", "start", "end", "orig_id", "ext", "size"])
        p = FilenameParts(
            wfo.code,
            attr["field_starttime"],
            attr["field_endtime"],
            str(_id).replace("-", ""),
            image.name.split(".")[-1],
            "_small" if idx == 1 else "",
        )
        filename = f"{p.wfo}_e{p.end}_s{p.start}_{p.orig_id}{p.size}.{p.ext}"
        files += (File(wire, name=filename),)

    with transaction.atomic():
        wx_story = WeatherStory(
            title=title,
            description=description,
            cwa_center=point,
            starttime=starttime,
            endtime=endtime,
            image=files[0],
            wfo=wfo,
        )
        if len(files) > 1:
            wx_story.small = files[1]
        wx_story.save()
        for temporary_image in temp:
            temporary_image.delete()

    # keep bucket usage under control
    WeatherStory.objects.prune(wfo)

    logger.info("Saved weather story for wfo %s as '%s' with id of '%s'", wfo, files[0].name, wx_story.id)

    # return the same JSON struct that Drupal used
    return FakeDrupal().weather_story(data)
