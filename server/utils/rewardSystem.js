// server/utils/rewardSystem.js
import User from "../models/authModel.js";

export async function addPointsAndBadge(userId, points = 0, badge = null) {
  try {
    if (!userId) return null;
    const user = await User.findById(userId);
    if (!user) return null;

    if (points > 0) {
      user.points = (user.points || 0) + points;
      console.log(`🏅 +${points} points → ${user.username || user.email}`);
    }

    if (badge) {
      const normalized = String(badge).trim();
      if (normalized && !user.badges.includes(normalized)) {
        user.badges.push(normalized);
        console.log(`🎖️ New badge: ${normalized}`);
      }
    }

    await user.save();
    return user;
  } catch (err) {
    console.error("❌ addPointsAndBadge:", err.message);
    return null;
  }
}

export async function recordQuizResult(userId, { courseId, score = 0, awardPoints = 0, badge = null }) {
  try {
    if (!userId) return null;
    const user = await User.findById(userId);
    if (!user) return null;

    user.quizHistory = user.quizHistory || [];
    user.quizHistory.push({ courseId: String(courseId), score, date: new Date() });

    if (awardPoints > 0) {
      user.points = (user.points || 0) + awardPoints;
      console.log(`🧠 +${awardPoints} quiz points`);
    }

    if (badge) {
      const normalized = String(badge).trim();
      if (normalized && !user.badges.includes(normalized)) {
        user.badges.push(normalized);
        console.log(`🏆 Badge added: ${normalized}`);
      }
    }

    await user.save();
    return user;
  } catch (err) {
    console.error("❌ recordQuizResult:", err.message);
    return null;
  }
}
