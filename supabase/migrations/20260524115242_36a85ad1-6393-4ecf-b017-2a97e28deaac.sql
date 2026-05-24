UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{cacheControl}', '"max-age=604800"')
WHERE bucket_id = 'marketing-images';