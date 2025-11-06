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
        
        # Get S3 key from request body
        body = json.loads(event.get('body', '{}'))
        s3_key = body.get('key')
        
        if not s3_key:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'S3 key is required'})
            }
        
        # Enforce access control: users can only delete their own files
        if not is_admin:
            user_prefix = f"users/{user_sub}/"
            if not s3_key.startswith(user_prefix):
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'You can only delete your own files'})
                }
        
        # Verify object exists before deletion
        try:
            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'File not found'})
                }
            raise
        
        # Delete the object
        s3_client.delete_object(
            Bucket=BUCKET_NAME,
            Key=s3_key
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'File deleted successfully',
                's3Key': s3_key
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