exports.readAndWrite=function(bucketName){

    const policy=
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "PublicReadGetObject",
          "Effect": "Allow",
          "Principal": "*",
          "Action":["s3:GetObject","s3:PutObject"],
          "Resource": "arn:aws:s3:::"+bucketName+"/*"
        }
      ]
  }
  
    return policy
  }

  exports.read=function(bucketName){

    const policy=
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "PublicReadGetObject",
          "Effect": "Allow",
          "Principal": "*",
          "Action":["s3:GetObject"],
          "Resource": "arn:aws:s3:::"+bucketName+"/*"
        }
      ]
  }
  
    return policy
  }