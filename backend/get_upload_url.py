import json
import boto3
import os
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']
URL_EXPIRATION = int(os.environ.get('URL_EXPIRATION', '3600'))

def lambda_handler(event, context):
    try:
        # Extract claims from JWT authorizer
        user_claims = event['requestContext']['authorizer']['jwt']['claims']
        user_sub = user_claims['sub']
        # Handle cognito:groups which can be a string like "[Admin-Group]" or an array
        cognito_groups_raw = user_claims.get('cognito:groups', '')

        if cognito_groups_raw:
            # Remove brackets and split
            cognito_groups_raw = cognito_groups_raw.strip('[]')
            user_groups = [g.strip() for g in cognito_groups_raw.split(',')] if cognito_groups_raw else []
        else:
            user_groups = []

        is_admin = 'Admin-Group' in user_groups
        
        # Get filename from request body
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename')
        
        if not filename:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Filename is required'})
            }
        
        # Determine S3 key based on role
        if is_admin:
            s3_key = body.get('path', filename)
        else:
            s3_key = f"users/{user_sub}/{filename}"
        
        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=URL_EXPIRATION
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                's3Key': s3_key,
                'expiresIn': URL_EXPIRATION
            })
        }
        
    except ClientError as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'S3 error: {str(e)}'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }