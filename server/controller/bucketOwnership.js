const AWS =require('aws-sdk')

AWS.config.update({
    
  });
  
  // Create an S3 service object
  const s3 = new AWS.S3({
    region:'ap-southeast-1' ,
    accessKeyId: 'AKIAZZFLZAVGRHAVSOP3',
    secretAccessKey: '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',
  });
  
  // Set up the parameters for PutBucketOwnershipControls
  const params = {
    Bucket: 'taeko-onuki',
    OwnershipControls: {
      Rules: [
        {
          ObjectOwnership: 'ObjectWriter',
        }
      ]
    }
  };
  
  // Call PutBucketOwnershipControls
  s3.putBucketOwnershipControls(params, (err, data) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Bucket ownership controls have been set:', data);
    }
  });