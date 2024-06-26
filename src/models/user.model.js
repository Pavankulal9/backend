import mongoose,{Schema} from 'mongoose';
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'

const userSchema = new Schema(
    {
        fullName:{
            type: String,
            required: true,
            trim: true,
            index: true
        },
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password:{
            type: String,
            required: [true, 'Password is required!'],
        },
        avatar:{
            type: String,
            required: true,
        },
        coverImage:{
            type: String,
            default: undefined
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref: 'Video'
            }
        ],
        refreshToken:{
            type: String,
            default: undefined
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre('save', async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcryptjs.hash(this.password,10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcryptjs.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
};

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};
export const User = mongoose.model('User',userSchema);