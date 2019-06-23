import { _baseOptions } from '../core/yargs';
import { getMigrator, ensureCollectionSchema } from '../core/migrator';

import helpers from '../helpers';
import _ from 'lodash';

exports.builder = yargs =>
  _baseOptions(yargs)
    .option('to', {
      describe: 'Migration name to run migrations until',
      type: 'string'
    })
    .option('from', {
      describe: 'Migration name to start migrations from (excluding)',
      type: 'string'
    }).argv;

exports.handler = async function (args) {
  const command = args._[0];

  await helpers.config.init();

  switch (command) {
    case 'db:migrate':
      await migrate(args);
      break;
    case 'db:migrate:status':
      await migrationStatus(args);
      break;
  }

  process.exit(0);
};

function migrate (args) {
  return getMigrator('migration', args)
    .then(migrator => {
      return ensureCollectionSchema(migrator)
        .then(() => migrator.pending())
        .then(migrations => {
          const options = {};
          if (migrations.length === 0) {
            helpers.view.log('No migrations were executed, database schema was already up to date.');
            process.exit(0);
          }
          if (args.to) {
            if (migrations.filter(migration => migration.file === args.to).length === 0) {
              helpers.view.log('No migrations were executed, database schema was already up to date.');
              process.exit(0);
            }
            options.to = args.to;
          }
          if (args.from) {
            if (migrations.map(migration => migration.file).lastIndexOf(args.from) === -1) {
              helpers.view.log('No migrations were executed, database schema was already up to date.');
              process.exit(0);
            }
            options.from = args.from;
          }
          return options;
        })
        .then(options => migrator.up(options));
    })
    .catch(e => helpers.view.error(e));
}

function migrationStatus (args) {
  return getMigrator('migration', args)
    .then(migrator => {
      return ensureCollectionSchema(migrator)
        .then(() => migrator.executed())
        .then(migrations => {
          _.forEach(migrations, migration => {
            helpers.view.log('up', migration.file);
          });
        })
        .then(() => migrator.pending())
        .then(migrations => {
          _.forEach(migrations, migration => {
            helpers.view.log('down', migration.file);
          });
        });
    })
    .catch(e => helpers.view.error(e));
}
