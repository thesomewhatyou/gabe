import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/gabe/docs',
    component: ComponentCreator('/gabe/docs', '5ff'),
    routes: [
      {
        path: '/gabe/docs',
        component: ComponentCreator('/gabe/docs', '1b9'),
        routes: [
          {
            path: '/gabe/docs',
            component: ComponentCreator('/gabe/docs', '663'),
            routes: [
              {
                path: '/gabe/docs/commands/',
                component: ComponentCreator('/gabe/docs/commands/', '650'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/config/',
                component: ComponentCreator('/gabe/docs/config/', '505'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/containers/',
                component: ComponentCreator('/gabe/docs/containers/', '8d1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/custom-commands/',
                component: ComponentCreator('/gabe/docs/custom-commands/', '860'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/intro',
                component: ComponentCreator('/gabe/docs/intro', '283'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/postgresql/',
                component: ComponentCreator('/gabe/docs/postgresql/', 'de2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/runtimes/',
                component: ComponentCreator('/gabe/docs/runtimes/', '4a6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/gabe/docs/setup/',
                component: ComponentCreator('/gabe/docs/setup/', '21c'),
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
    path: '/gabe/',
    component: ComponentCreator('/gabe/', 'dc4'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
