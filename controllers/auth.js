// ** Packages Import
require("dotenv").config();
const asyncHandler = require("express-async-handler");
const _ = require("lodash");
const expressJwt = require("express-jwt");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ** Models Import
const User = require("../models/user");
const Temp = require("../models/temp");
const SubUsersRole = require("../models/sub_user_roles");
const ResetPass = require("../models/resetPass");
const navbar = require("../models/navbar.js");
const location = require("../models/admin/settings/location");
const programRank = require("../models/program_rank");

// ** Helpers & Utilities Import
const { errorHandler } = require("../helpers/dbErrorHandler");
const otpGenerator = require("../Services/otpGenerator");
const { sendEmailVerification } = require("../Services/sendEmailVerification");
const from_email = process.env.from_email;
const Mailer = require("../helpers/Mailer");

// Hash Password Function
const hashPass = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password, salt);
  return hashed_password;
};

// @desc Get All Account/User
// @route GET /api/muj
// @access Public [?]
exports.getMuj = async (req, res) => {
  User.find({}, function (err, items) {
    res.json({ success: true, data: items });
  });
};

// @desc Send OTP before Creating a New Account/User
// @route POST /api/send-otp
// @access Public
exports.sendOTP = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, email, password } = req.body;

  const otp = otpGenerator();
  const hashed_password = (await hashPass(password)).toString();

  User.findOne({ email }, (err, user) => {
    if (err) {
      return res.status(500).json({
        errors: { common: { msg: err.message } },
      });
    }
    if (user) {
      return res.status(500).json({
        errors: { common: { msg: "Email Already Taken" } },
      });
    } else {
      Temp.findOne({ email }).exec(async (err, user) => {
        if (err) {
          return res.status(500).json({
            errors: { common: { msg: err.message } },
          });
        }

        if (user) {
          try {
            user.firstName = firstName;
            user.lastName = lastName;
            user.phone = phone;
            user.email = email;
            user.hashed_password = hashed_password;
            user.otp = otp;
            await user.save();

            // Send Otp
            await sendEmailVerification(email, otp);

            return res.status(200).json({
              success: "OTP re-generated & Sended successfully.",
            });
          } catch (error) {
            return res.status(500).json({
              errors: { common: { msg: err.message } },
            });
          }
        } else {
          let tempUser = new Temp({
            firstName,
            lastName,
            phone,
            email,
            hashed_password,
            otp,
          });
          // Send Otp
          await sendEmailVerification(email, otp);

          tempUser.save((err, success) => {
            if (err) {
              return res.status(500).json({
                errors: { common: { msg: err.message } },
              });
            }

            if (success) {
              return res.status(200).json({
                success: "OTP generated & sended successfully.",
              });
            }
          });
        }
      });
    }
  });
});

// @desc Create a New Account/User
// @route POST /api/signup
// @access Public
exports.signup = async (req, res) => {
  const { otp } = req.body;

  Temp.findOne({ otp }, (err, user) => {
    if (err) {
      return res.status(500).json({ errors: { common: { msg: err.message } } });
    }
    if (!user) {
      return res
        .status(401)
        .json({ errors: { common: { msg: "Invalid OTP" } } });
    } else {
      const { firstName, lastName, phone, email, hashed_password } = user;

      User.findOne({ email, phone }).exec((err, user) => {
        if (err) {
          return res.status(500).json({
            errors: { common: { msg: err.message } },
          });
        }

        if (user) {
          return res.status(409).json({
            errors: {
              common: { msg: "Email Already Taken" },
            },
          });
        } else {
          let newUser = new User({
            firstname: firstName,
            lastname: lastName,
            phone,
            email,
            password: hashed_password,
            isverify: true,
            isEmailverify: true,
            status: "Active",
          });

          newUser.save((err, success) => {
            if (err) {
              return res.status(500).json({
                errors: { common: { msg: err.message } },
              });
            }
            if (success) {
              Temp.findOneAndDelete({ email, otp }, (err, success) => {
                if (err) {
                  return res.status(500).json({
                    errors: { common: { msg: err.message } },
                  });
                }
                if (success) {
                  // Generate "Access Token", "Refresh Token" etc here if needed!

                  return res.status(200).json({
                    success: "New User Account Created Successfully.",
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};

// ==========================
// Old Signup process
// ==========================
// exports.signup = async (req, res) => {
//   let userBody = req.body;
//   console.log(userBody);
//   const user = new User(userBody);

//   const admins = await User.find(
//     {
//       role: 1,
//     },
//     {
//       email: 1,
//       _id: 0,
//     }
//   );
//   let sendToAllAdmins = [];
//   if (!admins.length) {
//     return res.send({
//       msg: "There is any admin avaible to accept your request.",
//     });
//   }
//   admins.map((email) => {
//     sendToAllAdmins.push(email["email"]);
//   });
//   let sendingMailToUser = userBody.email;

//   let msg = new Mailer({
//     to: [sendingMailToUser], // Change to your recipient
//     // from: from_email, // Change to your verified sender
//     subject: "Varification Email For User",
//     text: "Thanks for signing-up in ",
//     html: `<h2>Worth the wait! Soon you will get login credentials once the admin approves your request :)</h2>`,
//   });
//   user.save((err, userdata) => {
//     if (err) {
//       return res.status(400).json({
//         msg: "Email already exist!",
//         success: false,
//       });
//     } else {
//       msg
//         .sendMail()
//         .then((resp) => {
//           if (userBody.role == 2) {
//             User.updateOne(
//               { _id: userBody.mainUser },
//               {
//                 $addToSet: { subUsers: userdata._id },
//               }
//             ).exec((err, data) => {
//               if (err) {
//                 return res.send({
//                   msg: err.message.replace(/\"/g, ""),
//                   success: false,
//                 });
//               }
//               return res.send({
//                 msg: "sub-user created successfully",
//                 success: true,
//               });
//             });
//           } else {
//             return res.send({
//               msg: "User created successfully",
//               success: true,
//             });
//           }
//         })
//         .catch((err) => {
//           return res.send({
//             msg: err.message.replace(/\"/g, ""),
//             success: false,
//           });
//         });
//     }
//   });
// };

// @desc Sign in to an account
// @route POST /api/signin
// @access Public
exports.signin = async (req, res) => {
  const { username, email, password, isAccessLocations, locations } = req.body;
  if (!username) {
    return res.status(400).json({
      msg: "Please provide an valid Email!",
      success: false,
    });
  }
  if (!password) {
    return res.status(400).json({
      msg: "Password field must not be empty!",
      success: false,
    });
  }

  await User.findOne({
    $or: [{ username }, { email }], email: { $nin: [undefined, ""] },
    username: { $nin: [undefined, ""] }
  }).exec(async (err, data) => {
    if (!data) {
      await SubUsersRole.findOne({
        $or: [{ username: username }, { email: email }]
      }).exec(async (err, data) => {
        if (err || !data) {
          return res.status(400).json({
            msg: "User with that email does not exist. Please signup",
            success: false,
          });
        } else {
          if (data.password == req.body.password) {
            // if (data.status == 'Active') {
            const subUserData = data;
            const { userId, roles } = data;
            await User.findOne({ _id: userId }).exec(async (err, data) => {
              if (err || !data) {
                return res.status(400).json({
                  msg: "Sub-user does not exist. Please signup",
                  success: false,
                });
              } else {
                token = jwt.sign(
                  {
                    id: data._id,
                    auth_key: data.auth_key,
                    app_id: data.app_id,
                    epi: data.epi,
                    descriptor: data.descriptor,
                    product_description: data.product_description,
                  },
                  process.env.JWT_SECRET
                );
                res.cookie("t", token, {
                  expire: new Date() + 9999,
                });

                const {
                  _id,
                  logo,
                  bussinessAddress,
                  country,
                  state,
                  city,
                  twilio,
                  firstname,
                  lastname,
                } = data;

                const { username, password, email, phone, role } = subUserData;
                let default_location = await location.find({
                  _id: data.default_location,
                });
                let isLogin = new Date().getTime();
                let userData = await User.updateOne(
                  { username: username },
                  { isLogin: isLogin }
                );
                if (userData.nModified === 1) {
                  console.log({ success: true, msg: "islogin field updated" });
                } else {
                  console.log({ success: false, msg: "islogin not updated" });
                }
                return res.json({
                  success: true,
                  token,
                  data: {
                    _id,
                    locationName: data.locationName,
                    username,
                    phone,
                    rolename: role,
                    role: 0,
                    email,
                    logo,
                    bussinessAddress,
                    country,
                    state,
                    city,
                    default_locationData: default_location,
                    twilio,
                    firstname,
                    lastname,
                  },
                  roles,
                });
              }
            });

            // } else {
            // 	return res.json({
            // 		msg: 'Your account is deactivate!',
            // 		success: false,
            // 	});
            // }
          } else {
            res.send({
              msg: "Incorrect email/password!",
              success: false,
            });
          }
        }
      });
    } else {
      if (data.password == req.body.password) {
        if (data.role == 0 || data.role == 2) {
          if (data.isEmailverify) {
            if (data.status == "Active") {
              let locationData = await User.find({
                _id: data.locations,
              }).populate("default_location");
              let default_locationData = await location.find({
                _id: data.default_location,
              });
              if (isAccessLocations) {
                let current_locationData = await User.findOne({
                  locationName: req.body.locationName,
                });
                token = jwt.sign(
                  {
                    id: data._id,
                    auth_key: data.auth_key,
                    app_id: data.app_id,
                    epi: data.epi,
                    descriptor: data.descriptor,
                    product_description: data.product_description,
                  },
                  process.env.JWT_SECRET
                );
                res.cookie("t", token, {
                  expire: new Date() + 9999,
                });
                const {
                  _id,
                  username,
                  password,
                  name,
                  email,
                  role,
                  logo,
                  bussinessAddress,
                  country,
                  state,
                  city,
                  firstname,
                  lastname,
                } = data;
                return res.json({
                  success: true,
                  token,
                  data: {
                    _id,
                    locationName: current_locationData.locationName,
                    default_locationData,
                    locations: [...locationData, ...default_locationData],
                    username,
                    password,
                    name,
                    email,
                    role,
                    logo,
                    bussinessAddress,
                    country,
                    state,
                    city,
                    isAccessLocations,
                    firstname,
                    lastname,
                  },
                });
              }
              let userName = req.body.username;
              let isLogin = new Date().getTime();
              let userData = await User.updateOne(
                { username: userName },
                { isLogin: isLogin }
              );
              if (userData.nModified === 1) {
                console.log({ success: true, msg: "islogin field updated" });
              } else {
                console.log({ success: false, msg: "islogin not updated" });
              }
              token = jwt.sign(
                {
                  id: data._id,
                  auth_key: data.auth_key,
                  app_id: data.app_id,
                  epi: data.epi,
                  descriptor: data.descriptor,
                  product_description: data.product_description,
                },
                process.env.JWT_SECRET
              );
              res.cookie("t", token, {
                expire: new Date() + 9999,
              });
              const {
                _id,
                username,
                name,
                email,
                role,
                logo,
                locationName,
                bussinessAddress,
                country,
                state,
                city,
                twilio,
                firstname,
                lastname,
              } = data;

              return res.json({
                success: true,
                token,
                data: {
                  _id,
                  username,
                  default_locationData,
                  locations: [...locationData, ...default_locationData],
                  email,
                  name,
                  role,
                  logo,
                  locationName,
                  bussinessAddress,
                  city,
                  state,
                  country,
                  twilio,
                  firstname,
                  lastname,
                },
              });
            } else {
              return res.json({
                msg: "Your account is deactivate!",
                success: false,
              });
            }
          } else {
            return res.json({
              msg: "Your Email is not Verified!",
              success: false,
            });
          }
        } else if (data.role == 1) {
          // if (!data.authenticate(password)) {
          //     return res.status(401).json({
          //         error: 'Email and password dont match'
          //     });
          // }
          token = jwt.sign(
            {
              id: data._id,
              role: data.role,
            },
            process.env.JWT_SECRET
          );
          res.cookie("t", token, {
            expire: new Date() + 9999,
          });
          const { _id, username, name, email, role, firstname, lastname } =
            data;
          return res.json({
            token,
            data: {
              _id,
              username,
              email,
              name,
              role,
              firstname,
              lastname,
            },
            success: true,
          });
        } else {
          res.json({
            msg: "role is not added to user",
            success: false,
          });
        }
      } else {
        res.send({
          msg: `Incorrect email/password!`,
          success: false,
        });
      }
    }
  });
};

// @desc Sign out from an account
// @route POST /api/signout
// @access Public
exports.signout = (req, res) => {
  res.clearCookie("t");
  res.json({
    msg: "Signout success",
    success: true,
  });
};

// @desc Forget Password / Sending reset pass OTP
// @route POST /api/forgetPassword
// @access Public
exports.forgetpasaword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      failed: "Please provide your Email",
    });
  } else {
    User.findOne({ email }).exec(async (err, user) => {
      if (err) {
        return res.status(500).json({
          errors: { common: { msg: err.message } },
        });
      }
      if (!user) {
        return res.status(500).json({
          errors: { common: { msg: "Email is not valid" } },
        });
      } else {
        // Generate Otp
        const otp = otpGenerator();

        // Save email and otp
        await ResetPass.create({
          email,
          otp,
        });

        // Send otp
        await sendEmailVerification(email, otp);

        return res.status(200).json({
          success: "OTP Sending Successfull",
          email,
          otp,
        });
      }
    });
  }
});

// @desc Reset Password / Create a new password
// @route POST /api/signout
// @access Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { otp, password1, password2 } = req.body;

  if (password1 !== password2) {
    return res.status(500).json({
      errors: { common: { msg: "Passwords do not match!" } },
    });
  }

  let password = password1;

  const hashed_password = (await hashPass(password)).toString();

  const user = await ResetPass.findOne({ otp, isUsed: false });

  if (user) {
    if (otp && password) {
      if (user.email && parseInt(otp) === parseInt(user.otp)) {
        // =================
        User.findOneAndUpdate(
          { email: user.email },
          { password: hashed_password },
          { new: true },
          (err, success) => {
            if (err) {
              return res.status(500).json({
                errors: { common: { msg: err.message } },
              });
            }
            if (success) {
              ResetPass.findOneAndUpdate(
                { otp },
                { isUsed: true },
                (err, success) => {
                  if (err) {
                    return res.status(500).json({
                      errors: { common: { msg: err.message } },
                    });
                  }
                  if (success) {
                    return res.status(200).json({
                      success: "Password Reset Successfull.",
                    });
                  }
                }
              );
            }
          }
        );

        // ==================
      } else {
        return res.status(401).json({
          failed: "OTP is invalid",
        });
      }
    } else {
      return res.status(400).json({
        failed: "Please provide all fields",
      });
    }
  } else {
    return res.status(400).json({
      failed: "User Not Found",
    });
  }
});

exports.createLocations = async (req, res) => {
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  let userBody = req.body;
  const user = new User(userBody);

  let sendingMailToUser = userBody.email;

  //todo Pavan - Need to restructure the mail body as per the requirement
  // let msg = new Mailer({
  //   to: [sendingMailToUser], // Change to your recipient
  //   // from: from_email, // Change to your verified sender
  //   subject: 'Varification Email For User',
  //   text: 'Thanks for signing-up in ',
  //   html: `<h2>Worth the wait! Soon you will get login credentials once the admin approves your request :)</h2>`,
  // })
  user.save((err, userdata) => {
    if (err) {
      return res.status(400).json({
        msg: "Location already exist!",
        success: false,
      });
    } else {
      // msg.sendMail()
      // .then((resp) => {
      User.updateOne(
        { _id: userBody.mainUser },
        {
          $addToSet: { locations: userdata._id },
        }
      ).exec((err, data) => {
        if (err) {
          return res.send({
            msg: err.message.replace(/\"/g, ""),
            success: false,
          });
        }
        return res.send({
          msg: "location created successfully",
          success: true,
        });
      });

      // })
      // .catch((err) => {
      //   res.send({ msg: err.message.replace(/\"/g, ""), success: false });

      // })
    }
  });
};

exports.adminApproval = async (req, res) => {
  try {
    const adminId = req.body.adminId;
    const userId = req.body.userId;
    let adminRole = await User.findById(adminId, { role: 1 });
    if (adminRole.role === 1) {
      userData = await User.findById(userId);
      if (userData) {
        if (userData.status === "Active") {
          token = jwt.sign(
            {
              id: userId,
            },
            process.env.JWT_SECRET
          );
          res.cookie("t", token, {
            expire: new Date() + 9999,
          });
          res.send({
            data: {
              token: token,
              data: userData,
            },
            success: true,
          });
        } else {
          res.josn({
            msg: "User Status is not Active",
            success: false,
          });
        }
      } else {
        res.json({
          msg: "User not found",
          success: false,
        });
        throw new Error("user Not Found");
      }
    } else {
      res.json({
        msg: "Unauthorised",
        success: false,
      });
      throw new Error("Unauthorised for this action");
    }
  } catch (error) {
    res.send({ error: error.message.replace(/\"/g, ""), success: false });
  }
};

exports.approveUserRequestByAdmin = async (req, res) => {
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  let data = req.body;
  let query = req.params;
  let filter = {
    role: 0,
    _id: query.userId,
  };
  let isActive = await User.findOne(filter);

  if (isActive.status === "Inactive") {
    let password = Math.random().toString(36).slice(2);
    let update = {
      status: data.status,
      isverify: data.isverify,
      password: password,
    };

    let updatedUser = await User.findOneAndUpdate(filter, update, {
      returnOriginal: false,
    }).exec();
    if (!updatedUser) {
      res.send({
        staus: false,
        msg: "unable to update user",
      });
    }
    let msg = new Mailer({
      from: from_email,
      to: [updatedUser.email],
      subject: "Registration process with My_Member",
      text: "Congratulation, your request has been accepted.",
      html: `<h2>congratulation, your registration with My Member is completed.</h2>
      <p>Your username is ${updatedUser.username},  Login using this passward - ${password} </p> 
      <p>You can login here - ${process.env.RESET_URL}</p>
      `,
    });
    msg
      .sendMail()

      .then(() => {
        res.send({
          status: true,
          msg: "User has been updated successfully",
          data: {
            status: updatedUser["status"],
            location: updatedUser["isverify"],
          },
        });
      })
      .catch((error) => {
        res.send(error);
      });
  } else {
    let updates = {
      status: data.status,
      isverify: data.isverify,
    };
    await User.findOneAndUpdate(filter, updates);
    res.json({
      msg: "user is succesfully Inactivated",
      success: true,
    });
  }
};

exports.approvesendgridverification = (req, res) => {
  let email = req.body.email;
  let userId = req.params.userId;
  try {
    User.updateOne(
      { _id: userId, "sendgridVerification.email": email },
      { $set: { "sendgridVerification.$.isVerified": true } },
      { $push: { bussinessEmail: email } }
    )
      .then((rep) => {
        res.send({ msg: "Email succesfuly verified!", success: true });
      })
      .catch((err) => {
        res.send({ error: err.message.replace(/\"/g, ""), success: false });
      });
  } catch (err) {
    console.log(err);
  }
};

exports.unverifiedsendgriduserlist = (req, res) => {
  try {
    User.find(
      { "sendgridVerification.isVerified": false },
      { sendgridVerification: 1, userId: 1, username: 1 }
    )
      .then((data) => {
        res.send({ msg: "data!", success: true, data });
      })
      .catch((err) => {
        res.send({ msg: "No data", success: false });
      });
  } catch (err) {
    res.send({ error: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.addTwillioNumber = (req, res) => {
  let userId = req.params.userId;
  let twilio = req.body.twilio;
  try {
    User.findOneAndUpdate({ _id: userId }, { $set: { twilio: twilio } })
      .then((data) => {
        res.send({ msg: "updated successfully!", success: true });
      })
      .catch((err) => {
        res.send({ msg: err.message.replace(/\"/g, ""), success: false });
      });
  } catch (err) {
    res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  userProperty: "auth",
});

exports.isAuth = (req, res, next) => {
  let user = req.profile && req.auth && req.profile._id == req.auth.id;
  if (!user) {
    return res.status(403).json({
      msg: "Access denied",
      success: false,
    });
  }
  next();
};

if (!process.env.JWT_SECRET) {
  var jwtKey = require("./jwtKey.js").jwtKey;
} else {
  var jwtKey = process.env.JWT_SECRET;
}

exports.verifySchool = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader === undefined) {
      return res.status(401).send({ success: false, msg: "Unauthorized" });
    } else {
      const bearerToken = authHeader.split(" ")[1];
      if (typeof bearerToken !== "undefined") {
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
          if (err) {
            return res
              .status(403)
              .send({ success: false, msg: "Access denied" });
          } else {
            if (authData.id == req.params.userId) {
              req.valorCredentials = authData;
              next();
            } else {
              return res
                .status(403)
                .send({ success: false, msg: "Access denied" });
            }
          }
        });
      } else {
        return res.status(403).send({ success: false, msg: "Access denied" });
      }
    }
  } catch (err) {
    res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.isSchoolActiveted = (req, res, next) => {
  var token = req.headers["authorization"];
  const bearer = token.split(" ");
};

exports.isAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === undefined) {
    return res.status(401).send({ success: false, msg: "Unauthorized" });
  } else {
    const bearerToken = authHeader.split(" ")[1];
    if (typeof bearerToken !== "undefined") {
      jwt.verify(bearerToken, process.env.JWT_SECRET, (err, adminData) => {
        if (err) {
          return res.status(403).send({ success: false, msg: "Access denied" });
        } else {
          if (adminData.id == req.params.adminId && adminData.role == 1) {
            next();
          } else {
            return res
              .status(403)
              .send({ success: false, msg: "Access denied" });
          }
        }
      });
    } else {
      return res.status(403).send({ success: false, msg: "Access denied" });
    }
  }
};

function navbar_custom(user_id) {
  const Data = [
    {
      user_id: user_id,
      ui: "Dashboard",
      li: "",
    },
    {
      user_id: user_id,
      ui: "Student",
      li: [
        "Student",
        "Active Trail",
        "Lead",
        "Former Student",
        "Former Trail",
        "After School",
        "Camp",
        "Studen By Program",
        "Membership by Program",
      ],
    },

    {
      user_id: user_id,
      ui: "My School",
      li: ["Miss you call", "Renewals", "Birthday", "Candidates"],
    },
    {
      user_id: user_id,
      ui: "Testing",
      li: ["Eligible", "Recomended", "Registration"],
    },
    {
      user_id: user_id,
      ui: "Task and Goal",
      li: ["To Do List", "Goal"],
    },
    {
      user_id: user_id,
      ui: "Calendar",
      li: ["Attendence", "Appointment", "Self Check In"],
    },
    {
      user_id: user_id,
      ui: "Marketing",
      li: ["Email", "Compose", "Nurturing", "System", "Library", "Sent"],
    },
    {
      user_id: user_id,
      ui: "Shop",
      li: ["Membership", "Store", "Testing", "Purchase History"],
    },
    {
      user_id: user_id,
      ui: "My Money",
      li: ["Expenses", "Finance"],
    },
    {
      user_id: user_id,
      ui: "Finance",
      li: ["Delinquent", "Forecast", "CC Expiring", "Test"],
    },
    {
      user_id: user_id,
      ui: "Statistics",
      li: [
        "Active Students",
        "Active Trial",
        "Lead",
        "Former Student",
        "Former Trial",
        "After School",
        "Camp",
      ],
    },
    {
      user_id: user_id,
      ui: "Documents",
      li: "",
    },
    {
      user_id: user_id,
      ui: "Settings",
      li: "",
    },
  ];

  navbar.insertMany(Data).then((response) => { });
}

exports.get_navbar = async (req, res) => {
  const { user_id } = req.body;
  await navbar
    .find(
      {
        user_id: user_id,
      },
      {
        _id: 0,
        user_id: 0,
        __v: 0,
      }
    )
    .then((response) => {
      res.send(response);
    })
    .catch((error) => {
      res.json({
        error: errorHandler(error),
      });
    });
};

exports.edit_navbar_li = async (req, res) => {
  const { user_id, ui, li, newli } = req.body;
  await navbar
    .updateOne(
      {
        user_id: user_id,
        ui: ui,
        li: li,
      },
      {
        $set: {
          "li.$": newli,
        },
      }
    )
    .then((response) => {
      res.send(response);
    })
    .catch((error) => {
      res.json({
        error: errorHandler(error),
      });
    });
};

exports.edit_navbar_ui = async (req, res) => {
  const { user_id, ui, newui } = req.body;
  await navbar
    .updateOne(
      {
        user_id: user_id,
        ui: ui,
      },
      {
        $set: {
          ui: newui,
        },
      }
    )
    .then((response) => {
      res.send(response);
    })
    .catch((error) => {
      res.json({
        error: errorHandler(error),
      });
    });
};

exports.updateUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.userId, req.body).exec(
    (err, data) => {
      if (err) {
        res.send({ msg: "User is not updated!", success: false });
      } else {
        res
          .status(200)
          .send({ msg: "User is updated successfully", success: true });
      }
    }
  );
};

exports.school_listing = async (req, res) => {
  // var per_page = parseInt(req.body.per_page) || 10;
  // var page_no = parseInt(req.params.page_no) || 1;
  // var totalCount = await User.find({ role: 0, isEmailverify: true }).count();
  // var pagination = {
  // 	limit: per_page,
  // 	skip: per_page * (page_no - 1),
  // };
  // .limit(pagination.limit)
  // .skip(pagination.skip)

  await User.find({ role: 0, isEmailverify: true })
    .populate("default_location")
    .exec((err, data) => {
      if (err) {
        res.send({ msg: "data not found!", success: false });
      } else {
        res.status(200).send({ data: data, success: true });
      }
    });
};

exports.searchUser = async (req, res) => {
  const search = req.query.search;

  try {
    const data = await User.find({
      $or: [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { firstname: { $regex: search, $options: "i" } },
      ],
    }).populate("default_location");

    res.send({ data: data, success: true });
  } catch (err) {
    res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.sendOTP_to_email = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { email } = req.body;
    let now = new Date();
    const otp_expiration_time = AddMinutesToDate(now, 10);
    const otp = otpGenerator();
    if (!email) {
      res.send({ msg: "Email not provided!", success: false });
    }
    let msg = new Mailer({
      to: email, // Change to your recipient
      subject: "Email Verification",
      html: `Your OTP/verification code is ${otp}`,
    });
    await msg
      .sendMail()
      .then((resp) => {
        User.updateOne(
          { email: email },
          { $set: { otp: otp, otp_expiration_time: otp_expiration_time } },
          (err, resp) => {
            if (err) {
              res.send({ msg: err, success: false });
            }
            res.send({ msg: "OTP send Successfully!", success: true });
          }
        );
      })
      .catch((err) => {
        res.send({ msg: err.message.replace(/\"/g, ""), success: false });
      });
  } catch (err) {
    res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.verify_otp = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { otp, email } = req.body;
    const now = new Date();
    let msg = new Mailer({
      to: [email], // Change to your recipient
      // from: from_email, // Change to your verified sender
      subject: "Varification Email For User",
      text: "Thanks for signing-up in ",
      html: `<h2>Worth the wait! Soon you will get login credentials once the admin approves your request :)</h2>`,
    });
    let isCorrectOtp = await User.find({ email: email, otp: otp });
    if (isCorrectOtp.length) {
      await User.updateOne(
        { email: email, otp: otp, otp_expiration_time: { $gte: now } },
        {
          $set: {
            isEmailverify: true,
          },
        }
      ).exec((err, resp) => {
        if (err || !resp.nModified) {
          return res.send({
            msg: err ? err : "Your OTP is Expired!",
            success: false,
          });
        } else {
          msg
            .sendMail()
            .then((resp) => {
              return res.send({
                msg: "Email verified Successfully!",
                success: true,
              });
            })
            .catch((err) => {
              return res.send({
                msg: err.message.replace(/\"/g, ""),
                success: false,
              });
            });
        }
      });
    } else {
      res.send({ msg: "Your OTP is Incorrect!", success: false });
    }
  } catch (err) {
    return res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

function AddMinutesToDate(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

exports.memberStatistics = async (req, res) => {
  let type = req.query.type || "Active Student";
  let per_page = parseInt(req.params.per_page) || 10;
  let page_no = parseInt(req.params.page_no) || 0;
  var pagination = {
    limit: per_page,
    skip: per_page * page_no,
  };
  try {
    let data = await location.aggregate([
      {
        $project: {
          locationName: 1,
          userId: 1,
        },
      },
      {
        $lookup: {
          from: "members",
          localField: "userId",
          foreignField: "userId",
          as: "studentData",
          pipeline: [
            {
              $match: {
                studentType: type,
              },
            },
            {
              $project: {
                studentType: 1,
              },
            },
            {
              $group: {
                _id: "$studentType",
                count: {
                  $sum: 1,
                },
              },
            },
            {
              $project: {
                _id: 0,
                studentType: "$_id",
                count: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$studentData" },
      {
        $addFields: {
          convertedId: { $toObjectId: "$userId" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "convertedId",
          foreignField: "_id",
          as: "userData",
          pipeline: [
            {
              $project: {
                isLogin: 1,
                _id: 0,
              },
            },
          ],
        },
      },
      { $unwind: "$userData" },
      {
        $project: {
          locationName: 1,
          userId: 1,
          studentData: 1,
          userData: 1,
        },
      },
      { $sort: { "studentData.count": -1 } },

      {
        $facet: {
          paginatedResults: [
            { $skip: pagination.skip },
            { $limit: pagination.limit },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);
    res.send({
      data: data[0].paginatedResults,
      totalCount: data[0].totalCount[0].countDocuments,
      success: true,
    });
  } catch (err) {
    return res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.incomeStatistics = async (req, res) => {
  let year = req.query.year;
  let month = req.query.month;
  let yearlyMonthly = req.params.yearlyMonthly;
  let per_page = parseInt(req.params.per_page) || 10;
  let page_no = parseInt(req.params.page_no) || 0;
  try {
    if (yearlyMonthly == "monthly") {
      let monthData = await monthlyExpenseIncome(
        month,
        year,
        per_page,
        page_no
      );
      let incomeArr = [];
      for (let i of monthData.incomeByMembershipArray) {
        for (let j of monthData.incomeByProductArray) {
          let obj = { income: 0 };
          if (i.locationName == j.locationName) {
            obj.income =
              i.incomeByMembership[0].dpayment + j.incomeByProduct[0].balance;
            j.incomeByProduct.splice(0, 1, obj);
            incomeArr.push(j);
          }
        }
      }
      let finalResult = [];
      for (let i of monthData.expenseData) {
        for (let j of incomeArr) {
          let obj = { income: 0, expense: 0, net: 0 };
          if (i.locationName == j.locationName) {
            obj.net = j.incomeByProduct[0].income - i.expense[0].amount;
            obj.income = j.incomeByProduct[0].income;
            obj.expense = i.expense[0].amount;
            j.incomeByProduct.splice(0, 1, obj);
            finalResult.push(j);
          }
        }
      }
      res.send({
        data: finalResult,
        totalSchools: monthData.totalSchools,
        success: true,
      });
    } else if (yearlyMonthly == "yearly") {
      let yearData = await yealyExpenseIncome(year, per_page, page_no);
      let arr = [];
      for (let i of yearData.incomeByMembershipArray) {
        for (let j of yearData.incomeByProductArray) {
          let obj = { income: 0 };
          if (i.locationName == j.locationName) {
            obj.income =
              i.incomeByMembership[0].dpayment + j.incomeByProduct[0].balance;
            j.incomeByProduct.splice(0, 1, obj);
            arr.push(j);
          }
        }
      }
      let result = [];
      for (let i of yearData.expenseData) {
        for (let j of arr) {
          let obj = { income: 0, expense: 0, net: 0 };
          if (i.locationName == j.locationName) {
            obj.net = j.incomeByProduct[0].income - i.expense[0].amount;
            obj.income = j.incomeByProduct[0].income;
            obj.expense = i.expense[0].amount;
            j.incomeByProduct.splice(0, 1, obj);
            result.push(j);
          }
        }
      }

      res.send({
        data: result,
        totalSchools: yearData.totalSchools,
        success: true,
      });
    }
  } catch (err) {
    return res.send({ msg: err.message, success: false });
  }
};
exports.rankStatistics = async (req, res) => {
  let program = req.params.program;
  let per_page = parseInt(req.params.per_page) || 10;
  let page_no = parseInt(req.params.page_no) || 0;
  var pagination = {
    limit: per_page,
    skip: per_page * page_no,
  };
  try {
    let programData = await programRank.find(
      {},
      {
        programName: 1,
        rank_image: 1,
        rank_name: 1,
      }
    );
    let data = await location.aggregate([
      {
        $project: {
          locationName: 1,
          userId: 1,
        },
      },
      {
        $lookup: {
          from: "members",
          localField: "userId",
          foreignField: "userId",
          as: "studentData",
          pipeline: [
            {
              $project: {
                program: 1,
                current_rank_name: 1,
                current_rank_img: 1,
              },
            },
            {
              $match: {
                current_rank_name: { $ne: null },
                current_rank_img: { $ne: null },
              },
            },
            {
              $group: {
                _id: "$current_rank_name",
                count: {
                  $sum: { $cond: [{ $eq: ["$program", program] }, 1, 0] },
                },
                programName: { $first: program },
                rankName: { $first: "$current_rank_name" },
                rankImage: { $first: "$current_rank_img" },
              },
            },
            {
              $project: {
                _id: 0,
              },
            },
            { $sort: { count: 1 } },
          ],
        },
      },
      {
        $facet: {
          paginatedResults: [
            { $skip: pagination.skip },
            { $limit: pagination.limit },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);
    res.send({
      data: data[0].paginatedResults,
      programData: programData,
      totalCount: data[0].totalCount[0].countDocuments,
      success: true,
    });
  } catch (err) {
    return res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

exports.retentionStatistics = async (req, res) => {
  let per_page = parseInt(req.params.per_page) || 10;
  let page_no = parseInt(req.params.page_no) || 0;
  var pagination = {
    limit: per_page,
    skip: per_page * page_no,
  };
  try {
    let data = await location.aggregate([
      {
        $project: {
          locationName: 1,
          userId: 1,
        },
      },
      {
        $lookup: {
          from: "members",
          localField: "userId",
          foreignField: "userId",
          as: "ratingCount",
          pipeline: [
            {
              $project: {
                rating: 1,
              },
            },
            {
              $group: {
                _id: "-",
                ratings: { $push: "$rating" },
              },
            },
            {
              $project: {
                _id: 0,
              },
            },
          ],
        },
      },
      {
        $facet: {
          paginatedResults: [
            { $skip: pagination.skip },
            { $limit: pagination.limit },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);
    let result = data[0].paginatedResults;
    for (let i of result) {
      if (i.ratingCount.length > 0) {
        const rate = {
          zero: 0,
          oneToSeven: 0,
          sevenToFourteen: 0,
          fourteenToThirty: 0,
          thirtyToSixty: 0,
          sixtyToNinty: 0,
          nintyPlus: 0,
        };
        const rating = {
          zero: [],
          oneToSeven: [],
          sevenToFourteen: [],
          fourteenToThirty: [],
          thirtyToSixty: [],
          sixtyToNinty: [],
          nintyPlus: [],
        };
        for (let j of i.ratingCount[0].ratings) {
          if (j === 0) {
            rating.zero.push(j);
          } else if (j > 0 && j < 7) {
            rating.oneToSeven.push(j);
          } else if (j >= 7 && j < 14) {
            rating.sevenToFourteen.push(j);
          } else if (j >= 14 && j < 30) {
            rating.fourteenToThirty.push(j);
          } else if (j >= 30 && j < 60) {
            rating.thirtyToSixty.push(j);
          } else if (j >= 60 && j < 90) {
            rating.sixtyToNinty.push(j);
          } else if (j >= 90) {
            rating.nintyPlus.push(j);
          }
        }
        rate.zero = rating.zero.length;
        rate.oneToSeven = rating.oneToSeven.length;
        rate.sevenToFourteen = rating.sevenToFourteen.length;
        rate.fourteenToThirty = rating.fourteenToThirty.length;
        rate.thirtyToSixty = rating.thirtyToSixty.length;
        rate.sixtyToNinty = rating.sixtyToNinty.length;
        rate.nintyPlus = rating.nintyPlus.length;
        i.ratingCount.splice(0, 1, rate);
      }
    }
    return res.send({
      data: result,
      totalcount: data[0].totalCount[0].countDocuments,
      success: true,
    });
  } catch (err) {
    return res.send({ msg: err.message.replace(/\"/g, ""), success: false });
  }
};

async function monthlyExpenseIncome(month, year, perPage, pageNo) {
  const thisMonth = parseInt(month) || new Date().getMonth() + 1;
  const thisYear = parseInt(year) || new Date().getFullYear();
  let per_page = perPage || 10;
  let page_no = pageNo || 0;
  var pagination = {
    limit: per_page,
    skip: per_page * page_no,
  };
  let expenseData = await location.aggregate([
    {
      $project: {
        locationName: 1,
        userId: 1,
      },
    },
    {
      $addFields: {
        convertedId: { $toObjectId: "$userId" },
      },
    },
    {
      $lookup: {
        from: "expenses",
        localField: "convertedId",
        foreignField: "userId",
        as: "expense",
        pipeline: [
          {
            $project: {
              amount: 1,
              month: { $month: "$date" },
              year: { $year: "$date" },
            },
          },

          {
            $match: {
              month: thisMonth,
              year: thisYear,
            },
          },

          {
            $group: {
              _id: "-",
              amount: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);
  for (let i of expenseData[0].paginatedResults) {
    let obj = { amount: 0 };
    if (i.expense.length === 0) {
      i.expense.push(obj);
    }
  }

  const incomeByProductArray = await location.aggregate([
    {
      $project: {
        locationName: 1,
        userId: 1,
      },
    },
    {
      $lookup: {
        from: "buy_products",
        localField: "userId",
        foreignField: "userId",
        as: "incomeByProduct",
        pipeline: [
          {
            $project: {
              deposite: "$deposite",
              month: { $month: "$createdAt" },
              year: { $year: "$createdAt" },
              productType: "$product_type",
              createdAt: 1,
            },
          },
          {
            $match: {
              month: thisMonth,
              year: thisYear,
            },
          },
          {
            $group: {
              _id: null,
              balance: { $sum: "$deposite" },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);
  for (let i of incomeByProductArray[0].paginatedResults) {
    let obj = { balance: 0 };
    if (i.incomeByProduct.length === 0) {
      i.incomeByProduct.push(obj);
    }
  }

  const incomeByMembershipArray = await location.aggregate([
    {
      $project: {
        locationName: 1,
        userId: 1,
      },
    },
    {
      $lookup: {
        from: "buy_memberships",
        localField: "userId",
        foreignField: "userId",
        as: "incomeByMembership",
        pipeline: [
          {
            $project: {
              dpayment: "$dpayment",
              register_fees: "$register_fees",
              month: { $month: "$createdAt" },
              year: { $year: "$createdAt" },
              createdAt: 1,
            },
          },
          {
            $match: {
              month: thisMonth,
              year: thisYear,
            },
          },
          {
            $group: {
              _id: null,
              dpayment: { $sum: "$dpayment" },
              register_fees: { $sum: "$register_fees" },
            },
          },
          {
            $project: {
              _id: 0,
              register_fees: 0,
            },
          },
        ],
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);

  for (let i of incomeByMembershipArray[0].paginatedResults) {
    let obj = { dpayment: 0 };
    if (i.incomeByMembership.length === 0) {
      i.incomeByMembership.push(obj);
    }
  }
  return {
    expenseData: expenseData[0].paginatedResults,
    incomeByProductArray: incomeByProductArray[0].paginatedResults,
    incomeByMembershipArray: incomeByMembershipArray[0].paginatedResults,
    totalSchools: expenseData[0].totalCount[0].countDocuments,
  };
}

async function yealyExpenseIncome(year, perPage, pageNo) {
  const currentDate = new Date();
  const currentYear = parseInt(year) || currentDate.getFullYear();
  let per_page = perPage || 10;
  let page_no = pageNo || 0;
  var pagination = {
    limit: per_page,
    skip: per_page * page_no,
  };

  let expenseData = await location.aggregate([
    {
      $project: {
        locationName: 1,
        userId: 1,
      },
    },
    {
      $addFields: {
        convertedId: { $toObjectId: "$userId" },
      },
    },
    {
      $lookup: {
        from: "expenses",
        localField: "convertedId",
        foreignField: "userId",
        as: "expense",
        pipeline: [
          {
            $project: {
              amount: 1,
              month: { $month: "$date" },
              year: { $year: "$date" },
            },
          },

          {
            $match: {
              year: currentYear,
            },
          },

          {
            $group: {
              _id: "-",
              amount: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);
  for (let i of expenseData[0].paginatedResults) {
    let obj = { amount: 0 };
    if (i.expense.length === 0) {
      i.expense.push(obj);
    }
  }

  const incomeByProductArray = await location.aggregate([
    {
      $project: {
        locationName: 1,
        userId: 1,
      },
    },
    {
      $lookup: {
        from: "buy_products",
        localField: "userId",
        foreignField: "userId",
        as: "incomeByProduct",
        pipeline: [
          {
            $project: {
              deposite: "$deposite",
              month: { $month: "$createdAt" },
              year: { $year: "$createdAt" },
              productType: "$product_type",
              createdAt: 1,
            },
          },
          {
            $match: { year: currentYear },
          },
          {
            $group: {
              _id: null,
              balance: { $sum: "$deposite" },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);
  for (let i of incomeByProductArray[0].paginatedResults) {
    let obj = { balance: 0 };
    if (i.incomeByProduct.length === 0) {
      i.incomeByProduct.push(obj);
    }
  }

  const incomeByMembershipArray = await location.aggregate([
    {
      $project: {
        locationName: 1,
        userId: 1,
      },
    },
    {
      $lookup: {
        from: "buy_memberships",
        localField: "userId",
        foreignField: "userId",
        as: "incomeByMembership",
        pipeline: [
          {
            $project: {
              dpayment: "$dpayment",
              register_fees: "$register_fees",
              month: { $month: "$createdAt" },
              year: { $year: "$createdAt" },
              createdAt: 1,
            },
          },
          {
            $match: { year: currentYear },
          },
          {
            $group: {
              _id: null,
              dpayment: { $sum: "$dpayment" },
              register_fees: { $sum: "$register_fees" },
            },
          },
          {
            $project: {
              _id: 0,
              register_fees: 0,
            },
          },
        ],
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);

  for (let i of incomeByMembershipArray[0].paginatedResults) {
    let obj = { dpayment: 0 };
    if (i.incomeByMembership.length === 0) {
      i.incomeByMembership.push(obj);
    }
  }
  return {
    expenseData: expenseData[0].paginatedResults,
    incomeByProductArray: incomeByProductArray[0].paginatedResults,
    incomeByMembershipArray: incomeByMembershipArray[0].paginatedResults,
    totalSchools: expenseData[0].totalCount[0].countDocuments,
  };
}
