import nock from 'nock';
import labelApproval from '..';
import {Probot} from 'probot';
import pushPayload from './fixtures/push.json';

nock.disableNetConnect();

describe('Label Approval', () => {
  let probot: any;

  beforeEach(() => {
    probot = new Probot({id: 123, cert: 'test'});
    const app = probot.load(labelApproval);
    app.app = () => 'test';

    nock.cleanAll();

    nock('https://api.github.com')
      .post(/app\/installations\/\d+\/access_tokens/)
      .reply(200, {token: 'test'});

    nock('https://api.github.com')
      .get(/repos\/.+\/refs\/.+/)
      .reply(200, {
        object: {
          sha: 'aaa',
        },
      });

    // ¯\_(ツ)_/¯
    nock('https://api.github.com')
      .get('/repos/Codertocat/Hello-World/git/refs/tags/simple-tag')
      .reply(200, {
        object: {
          sha: 'aaa',
        },
      });
  });

  test('create label', async done => {
    nock('https://api.github.com')
      .get(/repos\/.+\/contents\/.+/)
      .reply(200, {
        content: Buffer.from(
          `
labels:
  - name: test
    color: ff0000

        `.trim(),
        ),
      });

    nock('https://api.github.com')
      .get(/repos\/.+\/labels\/.+/)
      .reply(404, {
        message: 'Not Found',
        documentation_url: '...',
      });

    nock('https://api.github.com')
      .post(/repos\/.+\/labels/, (body: any) => {
        expect(body).toMatchObject({name: 'test', color: 'ff0000'});
        done();
        return true;
      })
      .reply(201);

    nock('https://api.github.com')
      .get(/repos\/.+\/pulls/)
      .reply(200, [
        {
          labels: [{name: 'test'}],
        },
      ]);

    await probot.receive({name: 'push', payload: pushPayload});
  });

  test('send success status', async done => {
    nock('https://api.github.com')
      .get(/repos\/.+\/contents\/.+/)
      .reply(200, {
        content: Buffer.from(
          `
labels:
  - name: test
    color: ff0000

        `.trim(),
        ),
      });

    nock('https://api.github.com')
      .get(/repos\/.+\/labels\/.+/)
      .reply(200, {
        name: 'bug',
        description: "Something isn't working",
        color: 'f29513',
      });

    nock('https://api.github.com')
      .get(/repos\/.+\/pulls/)
      .reply(200, [
        {
          labels: [{name: 'test'}],
        },
      ]);

    nock('https://api.github.com')
      .post(/repos\/.+\/statuses\/aaa/, (body: any) => {
        expect(body.state).toBe('success');

        done();
        return true;
      })
      .reply(200);

    await probot.receive({name: 'push', payload: pushPayload});
  });

  test('send pending status', async done => {
    nock('https://api.github.com')
      .get(/repos\/.+\/contents\/.+/)
      .reply(200, {
        content: Buffer.from(
          `
  labels:
    - name: test
      color: ff0000

          `.trim(),
        ),
      });

    nock('https://api.github.com')
      .get(/repos\/.+\/labels\/.+/)
      .reply(200, {
        name: 'bug',
        description: "Something isn't working",
        color: 'f29513',
      });

    nock('https://api.github.com')
      .get(/repos\/.+\/pulls/)
      .reply(200, [
        {
          labels: [],
        },
      ]);

    nock('https://api.github.com')
      .post(/repos\/.+\/statuses\/aaa/, (body: any) => {
        expect(body.state).toBe('pending');

        done();
        return true;
      })
      .reply(200);

    await probot.receive({name: 'push', payload: pushPayload});
  });
});
