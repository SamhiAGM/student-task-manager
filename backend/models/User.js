const { mongoose } = require('../mongo');

function getUserModel() {
  if (mongoose.models.User) {
    return mongoose.models.User;
  }

  const { Schema } = mongoose;

  const userSchema = new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      passwordSalt: { type: String },
      authTokenHash: String,
      authTokenExpiresAt: Date,
      otpHash: String,
      otpExpiresAt: Date,
      otpRequestedAt: Date,
      otpCooldownUntil: Date,
      otpAttemptCount: { type: Number, default: 0 },
      otpLockedUntil: Date,
      resetSessionHash: String,
      resetSessionExpiresAt: Date
    },
    { timestamps: true }
  );

  userSchema.index({ email: 1 }, { unique: true });

  return mongoose.model('User', userSchema);
}

module.exports = getUserModel();