var Userdb = require('../model/model');
const AWS = require('aws-sdk');
const async=require('async');
const mongoose=require('mongoose');
const fs = require('fs');
const {readAndWrite} = require('./s3Policy')
const {read} = require('./s3Policy')


// create and save new user
exports.create = (req,res)=>{
    // validate request
    if(!req.body){
        res.status(400).send({ message : "Content can not be emtpy!"});
        return;
    }

    // new user
   // new user
   const bucket = new Userdb({
    name:req.body.name,
    email:req.body.email,
    reqLevel:req.body.reqLevel,
    bucketName:req.body.bucketName,
    bucketRegion:req.body.bucketRegion,
    publicAccess:req.body.publicAccess,
    versioning:req.body.versioning,
    bucketPolicy:req.body.bucketPolicy,
    cors:req.body.cors,
    remarks:req.body.cors
})

// save user in the database
bucket
    .save(bucket)
    .then(data => {
        //res.send(data)
        res.redirect('/');
    })
    .catch(err =>{
        res.status(500).send({
            message : err.message || "Some error occurred while creating a create operation"
        });
    });


let S3 = new AWS.S3({
    region: bucket.bucketRegion,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS,
    });


    const bucketParams = {
    Bucket: bucket.bucketName
    };

async.waterfall([

    function createBucket(callback) {
        S3.createBucket(bucketParams, (err, data) => {
          if (err) {
            console.error('Error creating bucket:', err);
            callback(err);
          } else {
            console.log('Bucket created successfully:', data.Location);
            callback(null);
          }
        });
      },

    function putVersioning(callback){
        if(bucket.versioning="Enable"){
        
            const versioningParams = {
            Bucket: bucket.bucketName,
            VersioningConfiguration: {
              Status: 'Enabled'
            }
          };

         S3.putBucketVersioning(versioningParams, (err, data) => {
            if (err) {
              console.error('Error configuring bucket versioning:', err);
            } else {
              console.log('Bucket versioning turned on for bucket:',bucket.bucketName);
            }
            callback(null);
          })
        }else{
            console.log('Bucket versioning turned off for bucket:',bucket.bucketName);
            callback(null);
        }
       
    },
    
    function putPublicAccess(callback){
        if(bucket.publicAccess=="Enable"){

            const publicAccessBlockParams= {
                Bucket: bucket.bucketName,
                PublicAccessBlockConfiguration: {
                BlockPublicAcls: false,
                IgnorePublicAcls: false,
                BlockPublicPolicy: false,
                RestrictPublicBuckets: false
                }
            }

            //input: publicAccessBlockParams
            //output:turn off all options in 'public access' 
            S3.putPublicAccessBlock(publicAccessBlockParams, (err, data) => {
                if (err) {
                console.error('Error turning off block public access:', err);
                } else {
                console.log('Block public access settings turned off successfully for the bucket:',bucket.bucketName);
                }
                callback(null);
            })
        }
        else{
            console.log('Block public access turned on for bucket:',bucket.bucketName);
            callback(null);
        }
    },

    function putBucketPolicy(callback){

      var policy
      if(bucket.bucketPolicy=="Get"){
          policy=read(bucket.bucketName)
          const bucketPolicyParams={
              Bucket:bucket.bucketName,
              Policy:JSON.stringify(policy)
          }

          S3.putBucketPolicy(bucketPolicyParams,(err,data)=>{
            if(err){
                console.error("error configuring bucket policy :",err)
                callback(err)
            }else{
                console.log("Bucket policy configured SUCCESSFULLY:",bucket.bucketName)
                callback(null)
            }
        })

      }else{
        policy=readAndWrite(bucket.bucketName)
        const bucketPolicyParams={
            Bucket:bucket.bucketName,
            Policy:JSON.stringify(policy)
        }

        S3.putBucketPolicy(bucketPolicyParams,(err,data)=>{
          if(err){
              console.error("error configuring bucket policy :",err)
              callback(err)
          }else{
              console.log("Bucket policy configured SUCCESSFULLY:",bucket.bucketName)
              callback(null)
          }
      })
      }
      
    },

    function putCORS(callback){
      if (bucket.cors=="Enable"){
          fs.readFile('./assets/policy/allowCors.json', 'utf8', (err, data) => {
              if (err) {
                console.error(`Error reading corsPolicy.json: ${err}`);
                return;
              }
            
              const corsPolicy = JSON.parse(data);
            
              // Convert the JSON-formatted CORS policy into an array of objects
              const corsRules = [corsPolicy];
             
            
              // Configure CORS for the bucket
              const corsParams = {
                Bucket: bucket.bucketName,
                CORSConfiguration: {
                  CORSRules: corsRules // Use the CORS rules as an array of objects
                }
              };
            
              S3.putBucketCors(corsParams, (err, corsData) => {
                if (err) {
                  console.error("Error configuring CORS",bucket.bucketName,err);
                  callback(err)
                } else {
                  console.log("CORS configured bucket:",bucket.bucketName);
                  callback(null)
                }
              });
            });
      }else{
          console.log("CORS setting DISABLED for bucket:",bucket.bucketName)
          callback(null)
      } 
      
    },


],function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('All functions executed successfully.');
    }
  }
  
)

}

// retrieve and return all users/ retrive and return a single user
exports.find = (req, res)=>{

    if(req.query.id){
        const id = req.query.id;

        Userdb.findById(id)
            .then(data =>{
                if(!data){
                    res.status(404).send({ message : "Not found user with id "+ id})
                }else{
                    res.send(data)
                }
            })
            .catch(err =>{
                res.status(500).send({ message: "Erro retrieving user with id " + id})
            })

    }else{
        Userdb.find()
            .then(user => {
                res.send(user)
            })
            .catch(err => {
                res.status(500).send({ message : err.message || "Error Occurred while retriving user information" })
            })
    }

    
}


// Update a new idetified user by user id
exports.update = (req, res) => {
  if (!req.body) {
      return res.status(400).send({ message: "Data to update can not be empty" });
  }

  console.log(req.body);
  const new_data = req.body;
  const id = req.params.id;

  let S3 = new AWS.S3({
    region: new_data.bucketRegion,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS,
    });

  async.waterfall([
      function updateDB(callback) {
          Userdb.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
              .then(data => {
                  if (!data) {
                      // Send an error response and call the callback with an error
                      res.status(404).send({ message: `Cannot Update user with ${id}. Maybe user not found!` });
                      callback(new Error(`Cannot Update user with ${id}. Maybe user not found!`));
                  } else {
                      // Call the callback with the data
                      callback(null, data);
                  }
              })
              
      },

      function updateVersioning(data, callback) {
          let versioningParams;
          if (new_data.versioning == "Enable") {
              versioningParams = {
                  Bucket: new_data.bucketName,
                  VersioningConfiguration: {
                      Status: 'Enabled'
                  }
              } ;
    

          } else {
              versioningParams = {
                  Bucket: new_data.bucketName,
                  VersioningConfiguration: {
                      Status: 'Suspended'
                  }
              };
      
          }

          S3.putBucketVersioning(versioningParams, (err, result) => {
              if (err) {
                  console.error('Error configuring bucket versioning:', err);
              } else {
                  console.log('Bucket versioning:',new_data.versioning, new_data.bucketName);
                  callback(null, data);
              }
          });
        },

      function updateBucketPolicy(data,callback){

          var policy
          let bucketPolicyParams;
          let log;
          if(new_data.bucketPolicy=="Get"){
              policy=read(new_data.bucketName)
               bucketPolicyParams={
                  Bucket:new_data.bucketName,
                  Policy:JSON.stringify(policy)
              }
              log="READ policy"
    
          }else{
            policy=readAndWrite(new_data.bucketName)
             bucketPolicyParams={
                Bucket:new_data.bucketName,
                Policy:JSON.stringify(policy)
            }    
            log="READ & WRITE policy"
            
          }
          S3.putBucketPolicy(bucketPolicyParams,(err,result)=>{
            if(err){
                console.error("error configuring bucket policy :",err)
                callback(err)
            }else{
                console.log("Bucket policy configured:",log,"-->",new_data.bucketName)
                callback(null,data)
            }
          })   
      },
      // function updatePublicAccess(callback){
        
      //   let publicAccessBlockParams;
      //   if(new_data.publicAccess=="Enable"){
      //       publicAccessBlockParams={
      //         Bucket: new_data.bucketName,
      //         PublicAccessBlockConfiguration: {
      //         BlockPublicAcls: false,
      //         IgnorePublicAcls: false,
      //         BlockPublicPolicy: false,
      //         RestrictPublicBuckets: false
      //         }
      //     }
      //     }else{
      //       publicAccessBlockParams={
      //         Bucket: new_data.bucketName,
      //         PublicAccessBlockConfiguration: {
      //         BlockPublicAcls: true,
      //         IgnorePublicAcls: true,
      //         BlockPublicPolicy: true,
      //         RestrictPublicBuckets: true
      //         }
      //     }
      //   }
      //         //input: publicAccessBlockParams
      //         //output:turn off all options in 'public access' 
      //         S3.putPublicAccessBlock(publicAccessBlockParams, (err, data) => {
      //           if (err) {
      //           console.error('Error turning off block public access:', err);
      //           } else {
      //           console.log('Block public access configured for the bucket:',new_data.bucketName);

      //           }
                
      //       })
          
      // },

      function updateCORS(data,callback) {
        let corsParams;
        if (new_data.cors == "Enable") {
          fs.readFile('./assets/policy/allowCors.json', 'utf8', (err, data) => {
            if (err) {
              console.error(`Error reading corsPolicy.json: ${err}`);
              return;
            }
            const corsPolicy = JSON.parse(data);
      
            // Convert the JSON-formatted CORS policy into an array of objects
            const corsRules = [corsPolicy];
      
            // Configure CORS for the bucket
            corsParams = {
              Bucket: new_data.bucketName,
              CORSConfiguration: {
                CORSRules: corsRules // Use the CORS rules as an array of objects
              }
            };
      
            S3.putBucketCors(corsParams, (err, corsData) => {
              if (err) {
                console.error("Error configuring CORS", new_data.bucketName, err);
               
              } else {
                console.log("CORS configured:", new_data.cors, "-->", new_data.bucketName);
    
              }
            });
          });
        } else {
          S3.deleteBucketCors({ Bucket: new_data.bucketName }, (err) => {
            if (err) {
              console.error("Error configuring CORS", new_data.bucketName, err);
            } else {
              console.log("CORS configured:", new_data.cors, "-->", new_data.bucketName);
           
            }
          });
        }
      },


    
  ], function (err, data) {
      if (err) {
          console.error('Error:', err);
          // Send a general error response here if needed.
      } else {
          console.log('All functions executed successfully.');
          // Send a success response here if needed.
      }
  });


};


// Delete a user with specified user id in the request
exports.delete = (req, res)=>{
    const id = req.params.id;

    async.waterfall([
        function deleteS3Bucket (callback){
            const ObjectId = mongoose.Types.ObjectId;
            const objectId = id ;
            const mySchema = new mongoose.Schema({
                name:{
                    type:String,
                    required:true
                },
                email:{
                    type:String,
                    required:true,
                    unique:true
                },
                reqLevel:String,
                bucketName:String,
                bucketRegion:String,
                publicAccess:String,
                versioning:String
            })
            const MyModel = mongoose.models.userdbs || mongoose.model('userdbs', mySchema);
            
              MyModel.findOne({ _id: new ObjectId(objectId) })
                .then(document => {
                  if (document) {
                    console.log('Found document:', document);
                    const params = {
                    Bucket: document.bucketName, // Specify the bucket name
                    };
                    console.log(document.bucketName)

                    let S3 = new AWS.S3({
                      region: document.bucketRegion,
                      accessKeyId: process.env.AWS_ACCESS_KEY,
                      secretAccessKey: process.env.AWS_SECRET_ACCESS,
                      });
                      
                    S3.deleteBucket(params, (err, data) => {
                      if (err) {
                        console.error('Error deleting bucket:', err);
                      } else {
                        console.log('Bucket deleted successfully');
                      }
                    })

                  } else {
                    console.log('Document not found');
                  }callback(null)
                })
                .catch(err => {
                  console.error('Error finding document:', err);
                  
                }
                )
              },

            function(callback){
              Userdb.findByIdAndDelete(id)
              .then(data => {
                if(!data){
                    res.status(404).send({ message : `Cannot Delete with id ${id}. Maybe id is wrong`})
                }else{
                    console.log(data);
                    res.send({
                        message : "User was deleted successfully!"
                    })
                }callback(null)
    
                  })
            }
                    
    ],function(err){
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('All functions executed successfully.');
      }
    }
    )
}

exports.login=(req,res)=>{
  credential={
    email:"admin@gmail.com",
    password:"admin123"
  }

  if(req.body.email==credential.email && req.body.password==credential.password){
    res.redirect('/');
    //res.end("login successful")
  }else{
    res.end("invalid username")
}
}

