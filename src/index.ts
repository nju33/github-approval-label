import {Application, Context} from 'probot';
import {getBranchName} from './helper';
import {PullRequestsListResponseItemLabelsItem} from '@octokit/rest';

const CONFIG_NAME = 'label-approval.yml';

interface Label {
  title: string;
  color: string;
}

/**
 * get the config file.
 */
const getConfig: (context: Context) => Promise<{labels: Label[]}> = async (
  context: Context
) => {
  return context.config(CONFIG_NAME, {
    labels: [] as Label[]
  }) as Promise<{labels: Label[]}>;
};

/**
 * whether exists labels that has been wrote config file.
 * if it is not exists, returns null
 */
const checkLabels = async (
  app: Application,
  context: Context,
  config: {labels: Label[]}
) => {
  return Promise.all(
    config.labels.map(async label => {
      return context.github.issues
        .getLabel(context.repo({name: label}))
        .catch(err => {
          app.log.error(err);
          return null;
        });
    })
  );
};

export = (app: Application) => {
  app.on('push', async context => {
    const config = await getConfig(context);

    await checkLabels(app, context, config).then(result => {
      return Promise.all(
        result.map(async (label, i) => {
          if (label === null) {
            await context.github.issues.createLabel(
              context.repo({
                name: config.labels[i],
                color: 'ffeb02'
              })
            );
          }
        })
      );
    });

    const _ref = context.payload.ref;
    const ref = _ref
      .split('/')
      .slice(1)
      .join('/');

    const {
      data
    }: {data: {object: {sha: string}}} = await context.github.gitdata.getRef(
      context.repo({ref})
    );

    const {
      data: [pullRequest]
    } = await context.github.pullRequests.list(
      context.repo({head: getBranchName(context.payload.ref)})
    );

    const currentLabels = pullRequest.labels;
    const currentLabelNames = currentLabels.map(label => label.name);

    await Promise.all(
      config.labels.map(async label => {
        let status: 'success' | 'pending' = 'pending';
        if (currentLabelNames.indexOf(label) > -1) {
          status = 'success';
        }

        return context.github.repos.createStatus(
          context.repo({
            sha: data.object.sha,
            state: status,
            target_url: 'https://nju33.com',
            description: `[${label}]が付いているか`,
            context: `ggf/${label}`
          })
        );
      })
    );
  });

  app.on('pull_request.labeled', async context => {
    app.log('labeled');

    const config = (await context.config('geek-git-flow.yml', {
      labels: ['test1', 'test2']
    })) as {labels: string[]};

    const currentLabels: PullRequestsListResponseItemLabelsItem[] =
      context.payload.pull_request.labels;
    const currentLabelNames = currentLabels.map(label => label.name);

    await Promise.all(
      config.labels.map(async label => {
        let status: 'success' | 'pending' = 'pending';
        if (currentLabelNames.indexOf(label) > -1) {
          status = 'success';
        }

        return context.github.repos.createStatus(
          context.repo({
            sha: context.payload.pull_request.head.sha,
            state: status,
            target_url: 'https://nju33.com',
            description: `[${label}]が付いているか`,
            context: `ggf/${label}`
          })
        );
      })
    );
  });

  app.on('pull_request.unlabeled', async context => {
    app.log('unlabeled');

    const config = (await context.config('geek-git-flow.yml', {
      labels: ['test1', 'test2']
    })) as {labels: string[]};

    const currentLabels: PullRequestsListResponseItemLabelsItem[] =
      context.payload.pull_request.labels;
    const currentLabelNames = currentLabels.map(label => label.name);

    await Promise.all(
      config.labels.map(async label => {
        let status: 'success' | 'pending' = 'pending';
        if (currentLabelNames.indexOf(label) > -1) {
          status = 'success';
        }

        return context.github.repos.createStatus(
          context.repo({
            sha: context.payload.pull_request.head.sha,
            state: status,
            target_url: 'https://nju33.com',
            description: `[${label}]が付いているか`,
            context: `ggf/${label}`
          })
        );
      })
    );
  });
};
