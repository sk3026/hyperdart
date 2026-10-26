
import pkg from './package.json' with { type: 'json' };

export default {
  name: pkg.name,

  triggers: {
    keywords: [
      'tourist attractions',
      'tourist attraction',
      'things to do',
      'places to visit',
      'places to see',
      'best places to visit',
      'landmarks',
      'sights',
      'points of interest',
      'museums',
      'museum',
      'monuments',
      'monument',
      'temples',
      'temple',
      'forts',
      'fort',
      'viewpoints',
      'viewpoint',
      'parks',
      'park',
      'historic sites',
      'historical sites',
      'attractions',
      'tourism'
    ]
  },

  query_format: {
    regex: [
      '.*(tourist\\s+attractions?|things\\s+to\\s+do|places\\s+to\\s+(visit|see)|best\\s+places\\s+to\\s+visit|landmarks?|sights|points\\s+of\\s+interest|museums?|monuments?|temples?|forts?|viewpoints?|parks?|historic(al)?\\s+sites?|attractions?).*'
    ]
  },

  client: {
    location: pkg.module,
    moduleName: pkg.umdName || 'HD' + pkg.name,
    baseURL: '/' + pkg.name
  },

  format: {
    mainline: true,
    sidebar: true
  },

  permissions: {},

  info: {},

  github: 'https://github.com/sk3026/hyperdart',

  demovideo: ''
};
