# This file takes care of importing bootstrap
# resources onto a new developer's machine if needed
# import happens automatically on a normal ./apply.sh run

import {
  to = cloudfoundry_org_role.sa_org_manager
  id = "099220a7-f138-4d70-bba0-321bee76c6f2"
}
import {
  to = cloudfoundry_service_credential_binding.bucket_creds
  id = "341e5521-f35a-4e0a-be4f-b307080b30f8"
}
import {
  to = cloudfoundry_service_credential_binding.runner_sa_key
  id = "3068e511-a5b8-4e74-a2ed-2434ccb0b41a"
}
import {
  to = cloudfoundry_service_instance.runner_service_account
  id = "ca696763-8f8d-4032-8552-904a10cea2f5"
}
import {
  to = module.mgmt_space.cloudfoundry_space.space
  id = "f8937e7b-2fa0-4e89-958b-452211a73aff"
}
import {
  to = module.s3.cloudfoundry_service_instance.bucket
  id = "0c7524bc-b371-4721-affb-672dc6f923aa"
}

locals {
  developer_import_map = "{\"james.tranovich@noaa.gov\":\"d488497b-7e90-43ba-a823-8d67dfdb15a9\",\"seamus.johnston@noaa.gov\":\"469522ce-6e0b-4a48-9113-95c5974c63c9\"}"
  manager_import_map   = "{}"
}
import {
  for_each = jsondecode(local.developer_import_map)
  to       = module.mgmt_space.cloudfoundry_space_role.developers[each.key]
  id       = each.value
}
import {
  for_each = jsondecode(local.manager_import_map)
  to       = module.mgmt_space.cloudfoundry_space_role.managers[each.key]
  id       = each.value
}
