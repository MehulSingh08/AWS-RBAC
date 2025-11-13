import boto3

cognito = boto3.client('cognito-idp')
USER_POOL_ID = 'region_xxxxxxx' 

def lambda_handler(event, context):
    # Get user attributes
    user_attributes = event['request']['userAttributes']
    username = event['userName']
    
    # Check if user requested admin role
    custom_role = user_attributes.get('custom:role', 'user')
    
    # Only auto-add regular users to User-Group
    # Admin users will be manually approved
    if custom_role != 'admin':
        try:
            cognito.admin_add_user_to_group(
                UserPoolId=USER_POOL_ID,
                Username=username,
                GroupName='User-Group'
            )
            print(f"Added user {username} to User-Group")
        except Exception as e:
            print(f"Error adding user to group: {str(e)}")
    else:
        print(f"User {username} requested admin access - requires manual approval")
    
    return event