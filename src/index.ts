import {Application, Context} from 'probot';
import {getBranchName} from './helpers/get-branch-name';
import {PullRequestsListResponseItemLabelsItem} from '@octokit/rest';

const CONFIG_NAME = 'approval-label.yml';

interface Label {
  name: string;
  color: string;
}

const enum GithubStatus {
  Success = 'success',
  Pending = 'pending',
}

/**
 * get the config file.
 */
const getConfig: (context: Context) => Promise<{labels: Label[]}> = async (
  context: Context,
) => {
  return context.config(CONFIG_NAME, {
    labels: [] as Label[],
  }) as Promise<{labels: Label[]}>;
};

/**
 * whether exists labels that has been wrote config file.
 * if it is not exists, returns null
 */
const checkLabels = async (
  app: Application,
  context: Context,
  config: {labels: Label[]},
) => {
  return Promise.all(
    config.labels.map(async label => {
      return context.github.issues
        .getLabel(context.repo({name: label.name}))
        .catch(err => {
          app.log.error(err);
          return null;
        });
    }),
  );
};

/**
 * generate status description from template
 */
const genStatusDescription = (label: Label, status: GithubStatus) => {
  if (status === GithubStatus.Pending) {
    return `Waiting for [${label.name}]`;
  }

  return `Approved [${label.name}]`;
};

/**
 * generate status context from template
 */
const genStatusContext = (label: Label) => {
  return `approval-label/${label.name}`;
};

/**
 * get status of the label name
 */
const getGithubStatus = (label: Label, currentLabelNames: string[]) => {
  let status = GithubStatus.Pending;
  if (currentLabelNames.indexOf(label.name) > -1) {
    status = GithubStatus.Success;
  }

  return status;
};

export = (app: Application) => {
  const router = app.route('/process');
  router.get('/status', (_: any, res: any) => {
    res.end('working');
  });

  app.on('push', async context => {
    const config = await getConfig(context);

    await checkLabels(app, context, config).then(result => {
      return Promise.all(
        result.map(async (label, i) => {
          if (label === null) {
            const currentLabel = config.labels[i];
            await context.github.issues.createLabel(context.repo(currentLabel));
          }
        }),
      );
    });

    const _ref = context.payload.ref;
    const ref = _ref
      .split('/')
      .slice(1)
      .join('/');

    const {
      data: refData,
    }: {data: {object: {sha: string}}} = await context.github.gitdata.getRef(
      context.repo({ref}),
    );

    const {
      data: [pullRequest],
    } = await context.github.pullRequests.list(
      context.repo({head: getBranchName(context.payload.ref)}),
    );
    const currentLabels = pullRequest.labels;
    const currentLabelNames = currentLabels.map(label => label.name);

    await Promise.all(
      config.labels.map(async label => {
        const status = getGithubStatus(label, currentLabelNames);

        const statusParam = context.repo({
          sha: refData.object.sha,
          state: status,
          description: genStatusDescription(label, status),
          context: genStatusContext(label),
        });
        return context.github.repos.createStatus(statusParam);
      }),
    );
  });

  app.on('pull_request.labeled', async context => {
    const config = await getConfig(context);
    const refSha = context.payload.pull_request.head.sha;

    const currentLabels: PullRequestsListResponseItemLabelsItem[] =
      context.payload.pull_request.labels;
    const currentLabelNames = currentLabels.map(label => label.name);

    await Promise.all(
      config.labels.map(async label => {
        const status = getGithubStatus(label, currentLabelNames);

        const statusParam = context.repo({
          sha: refSha,
          state: status,
          description: genStatusDescription(label, status),
          context: genStatusContext(label),
        });
        return context.github.repos.createStatus(statusParam);
      }),
    );
  });

  app.on('pull_request.unlabeled', async context => {
    const config = await getConfig(context);
    const refSha = context.payload.pull_request.head.sha;

    const currentLabels: PullRequestsListResponseItemLabelsItem[] =
      context.payload.pull_request.labels;
    const currentLabelNames = currentLabels.map(label => label.name);

    await Promise.all(
      config.labels.map(async label => {
        const status = getGithubStatus(label, currentLabelNames);

        const statusParam = context.repo({
          sha: refSha,
          state: status,
          description: genStatusDescription(label, status),
          context: genStatusContext(label),
        });
        return context.github.repos.createStatus(statusParam);
      }),
    );
  });
};
