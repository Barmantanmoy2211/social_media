import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(401).json({
        msg: "Please fill in all fields.",
        success: false,
      });

    const user = await User.findOne({ email });

    if (user)
      return res.status(401).json({
        msg: "User already exists.",
        success: false,
      });

    const hasspassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      email,
      password: hasspassword,
    });

    return res.status(201).json({
      msg: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(401).json({
        msg: "Please fill in all fields.",
        success: false,
      });

    let user = await User.findOne({ email });

    if (!user)
      return res.status(401).json({
        msg: "User does not exist.",
        success: false,
      });

    const passwordIsmatch = await bcrypt.compare(password, user.password);

    if (!passwordIsmatch)
      return res.status(401).json({
        msg: "Invalid credentials.",
        success: false,
      });

    const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });
    //populate each post if in the post array
    const populatedUser = await Promise.all(
      user.posts.map( async (postid) => {
        const post = await Post.findById(postid);

        if(post.author.equals(user._id)) {
          return post;
        }
        return null;
      })
    );

    user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      posts: user.posts,
    };

    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        msg: `Login successful ${user.username}`,
        success: true,
        user,
      });
  } catch (error) {
    console.log(error);
  }
};

export const logout = async (_, res) => {
  try {
    return res.cookie("token", "", { maxAge: 0 }).json({
      msg: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    let user = await User.findById(userId).select("-password");
    return res.status(200).json({
      user,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { bio, gender } = req.body;
    const profilePicture = req.file;

    let cloudResponse;
    if (profilePicture) {
      const fileUri = getDataUri(profilePicture);
      cloudResponse = await cloudinary.uploader.upload(fileUri);
    }

    const user = await User.findById(userId).select("-password");
    if (!user)
      return res.status(401).json({
        msg: "User does not exist.",
        success: false,
      });
    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (profilePicture) user.profilePicture = cloudResponse.secure_url;

    await user.save();

    return res.status(200).json({
      msg: "Profile updated successfully.",
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const suggestedUser = await User.find({ _id: { $ne: req.id } }).select(
      "-password"
    );
    if (!suggestedUser)
      return res.status(401).json({
        msg: "Currently do not have any users.",
        success: false,
      });
    return res.status(200).json({
      success: true,
      users: suggestedUser,
    });
  } catch (error) {
    console.log(error);
  }
};

export const followOrUnfollow = async (req, res) => {
  try {
    const followerId = req.id; //follow karne wala
    const followingId = req.params.id; //jisko follow karunga

    if (followerId === followingId)
      return res.status(400).json({
        msg: "You cannot follow yourself.",
        success: false,
      });

    const user = await User.findById(followerId);
    const targetUser = await User.findById(followingId);

    if (!user || !targetUser)
      return res.status(400).json({
        msg: "User does not exist.",
        success: false,
      });

    const isFollowing = user.following.includes(followingId);
    if (isFollowing) {
      //unfollow logic
      await Promise.all([
        User.updateOne(
          { _id: followerId },
          { $pull: { following: followingId } }
        ),
        User.updateOne(
          { _id: followingId },
          { $pull: { following: followerId } }
        ),
      ]);
      return res
        .status(200)
        .json({ message: "Unfollowed successfully", success: true });
    } else {
      //follow logic
      await Promise.all([
        User.updateOne(
          { _id: followerId },
          { $push: { following: followingId } }
        ),
        User.updateOne(
          { _id: followingId },
          { $push: { following: followerId } }
        ),
      ]);
      return res
        .status(200)
        .json({ message: "followed successfully", success: true });
    }
  } catch (error) {
    console.log(error);
  }
};
