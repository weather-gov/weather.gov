from django.db import models

class Region(models.Model):
    name = models.CharField(max_length=128)
    weight = models.IntegerField(default=100)

    def __str__(self):
        return f"{self.name}"


class WFO(models.Model):
    name = models.CharField(max_length=256)
    weight = models.IntegerField(default=0)
    code = models.CharField(max_length=3, unique=True)
    region = models.ForeignKey(Region, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.name} ({self.code})"
    
