import feathers from 'feathers';
import authentication from 'feathers-authentication';
import memory from 'feathers-memory';
import hooks from 'feathers-hooks';
import jwt from '../src';
import { expect } from 'chai';

describe('integration', () => {
  it('verifies', () => {
    const User = {
      email: 'admin@feathersjs.com',
      password: 'password'
    };

    const req = {
      query: {},
      body: {},
      headers: {},
      cookies: {}
    };

    const issueJWT = () => {
      return hook => {
        const app = hook.app;
        const id = hook.result.id;
        return app.passport.createJWT({ userId: id }, app.get('auth')).then(accessToken => {
          hook.result.accessToken = accessToken;
          return Promise.resolve(hook);
        });
      };
    };

    const app = feathers();

    app.configure(hooks())
      .use('/users', memory())
      .configure(authentication({ secret: 'secret' }))
      .configure(jwt());

    app.service('users').hooks({
      after: {
        create: issueJWT()
      }
    });

    app.setup();

    return app.service('users').create(User).then(user => {
      req.headers = { 'authorization': user.accessToken };

      return app.authenticate('jwt')(req).then(result => {
        expect(result.success).to.equal(true);
        expect(result.data.user.email).to.equal(User.email);
        expect(result.data.user.password).to.not.equal(undefined);
      });
    });
  });
});
