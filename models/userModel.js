const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;
const userSchema = new Schema({
  name: String,
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
  },
  otp:String,
  otpExpireTime:Date,
  isVerified:{
    type:Boolean,
    default:false
  },
  token:String
}, { timestamps: true });
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.correctOTP = async function (
  otp,
  userOtp
) {
  return await bcrypt.compare(otp, userOtp);
};
userSchema.methods.createOTP = async function () {
  const otp = `${Math.floor(1000 + Math.random() * 900)}`;
  const hashOTP = await bcrypt.hash(otp, 12);
  this.otp = hashOTP;
  this.otpExpireTime = Date.now() + 10 * 60 * 1000;
  return otp;
};
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
