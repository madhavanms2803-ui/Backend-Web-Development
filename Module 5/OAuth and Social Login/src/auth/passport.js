'use strict';
// auth/passport.js — Google OAuth strategy

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { users, nextId } = require('../data');

/**
 * Map a verified Google profile to an existing or new local user.
 *
 * Lookup order matters:
 * 1. Match the stable Google subject first.
 * 2. Link an existing local account only when Google verified the email.
 * 3. Otherwise create a new least-privileged member account.
 */
async function verifyCallback(accessToken, refreshToken, profile, done) {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;

    // 1. Returning OAuth user: Google's stable ID is the primary key.
    let user = users.find((candidate) => candidate.googleId === googleId);
    if (user) {
      return done(null, user);
    }

    // 2. Existing local account: link only a Google-verified email.
    user = users.find((candidate) => candidate.email === email);
    if (user) {
      if (profile._json.email_verified !== true) {
        return done(null, false);
      }

      user.googleId = googleId;
      return done(null, user);
    }

    // 3. New account: always start with the lowest privilege.
    const newUser = {
      id: nextId(),
      googleId,
      email,
      name: profile.displayName,
      role: 'member',
    };

    users.push(newUser);
    return done(null, newUser);
  } catch (err) {
    return done(err);
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
      callbackURL: '/auth/google/callback',
    },
    verifyCallback,
  ),
);

module.exports = { passport, verifyCallback };
