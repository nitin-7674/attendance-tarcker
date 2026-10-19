function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

function createAuthController(authService) {
  async function establishSession(req, user) {
    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
  }

  return {
    async register(req, res, next) {
      try {
        const user = await authService.register(req.validatedBody);
        await establishSession(req, user);
        res.status(201).json({ data: { user } });
      } catch (error) {
        next(error);
      }
    },

    async login(req, res, next) {
      try {
        const user = await authService.login(req.validatedBody);
        await establishSession(req, user);
        res.json({ data: { user } });
      } catch (error) {
        next(error);
      }
    },

    async logout(req, res, next) {
      try {
        await destroySession(req);
        res.clearCookie('sat.sid');
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },

    async me(req, res, next) {
      try {
        const user = await authService.getProfile(req.auth.ownerId);
        res.json({ data: { user } });
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = { createAuthController };
