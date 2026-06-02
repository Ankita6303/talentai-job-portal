exports.up = async (knex) => {
  await knex.schema.createTableIfNotExists('users', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('email').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('name').notNullable();
    t.string('role').defaultTo('student');
    t.string('plan').defaultTo('free');
    t.timestamps(true, true);
  });
  // ... other tables
};
exports.down = async (knex) => knex.schema.dropTableIfExists('users');