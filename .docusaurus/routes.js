import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', '342'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'e40'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'a5d'),
            routes: [
              {
                path: '/docs/commands/',
                component: ComponentCreator('/docs/commands/', '3cf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/config/',
                component: ComponentCreator('/docs/config/', '38b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/containers/',
                component: ComponentCreator('/docs/containers/', '690'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/custom-commands/',
                component: ComponentCreator('/docs/custom-commands/', '38e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '89a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/postgresql/',
                component: ComponentCreator('/docs/postgresql/', '270'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/runtimes/',
                component: ComponentCreator('/docs/runtimes/', 'fc7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/setup/',
                component: ComponentCreator('/docs/setup/', '859'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', '070'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
