def lambda_handler(event, context):
    # Automatically confirm the user
    event['response']['autoConfirmUser'] = True

    # Mark email/phone as verified so Cognito doesn't try to send codes later
    if 'email' in event['request']['userAttributes']:
        event['response']['autoVerifyEmail'] = True
    if 'phone_number' in event['request']['userAttributes']:
        event['response']['autoVerifyPhone'] = True

    return event