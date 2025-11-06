import json
import boto3
import os
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']

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
        
        # Determine prefix based on role
        if is_admin:
            prefix = ''
            if event.get('queryStringParameters') and event['queryStringParameters'].get('prefix'):
                prefix = event['queryStringParameters']['prefix']
        else:
            prefix = f"users/{user_sub}/"
        
        # List objects in S3
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=prefix
        )
        
        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'lastModified': obj['LastModified'].isoformat()
                })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'files': files,
                'prefix': prefix,
                'count': len(files)
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