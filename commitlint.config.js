export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'build', // Build system or external dependencies
        'ci', // CI/CD changes
        'chore', // Maintenance tasks
        'revert', // Reverting changes
      ],
    ],
    // Subject should not be empty
    'subject-empty': [2, 'never'],
    // Type should not be empty
    'type-empty': [2, 'never'],
    // Subject should be lowercase
    'subject-case': [2, 'always', 'lower-case'],
  },
};
