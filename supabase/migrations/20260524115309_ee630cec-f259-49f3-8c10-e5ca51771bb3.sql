UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{cacheControl}', '"604800"')
WHERE bucket_id = 'marketing-images';