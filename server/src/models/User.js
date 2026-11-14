import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    email:{
        type : String,
        required : true,
        trim: true,
        lowercase: true,
        maxlength: 254
    },
    passwordHash: {
        type : String,
        required : true,
        select: false,
    },
    tokenVersion: {
        type : Number,
        default : 0
    }
  },
  {timestamps: true}
);

// make the DATABASE reject two users with the same email
userSchema.index({ email: 1 }, { unique: true }); 
userSchema.methods.toPublic = function (){
    return {
        id: String(this._id),
        name: this.name,
        email: this.email,
        createdAt: this.createdAt
    }
};
export const User = mongoose.model('User', userSchema);