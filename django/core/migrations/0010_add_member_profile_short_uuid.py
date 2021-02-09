# Generated by Django 3.0.11 on 2021-02-02 23:36

from django.db import migrations
import shortuuid


class Migration(migrations.Migration):

    def add_short_uuid(apps, schema_editor):
        MemberProfile = apps.get_model('core', 'MemberProfile')
        for mp in MemberProfile.objects.filter(short_uuid=None).all():
            mp.short_uuid = shortuuid.uuid()
            mp.save()

    def remove_short_uuid(apps, schema_editor):
        MemberProfile = apps.get_model('core', 'MemberProfile')
        for mp in MemberProfile.objects.all():
            mp.short_uuid = None
            mp.save()

    dependencies = [
        ('core', '0009_memberprofile_short_uuid'),
    ]

    operations = [
        migrations.RunPython(add_short_uuid, remove_short_uuid),
    ]