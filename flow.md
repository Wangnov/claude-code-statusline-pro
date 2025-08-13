graph TD
    A([开始: 提出需求]) --> B{有现有代码库?};
    B -- 是 --> C[基于记忆(CLAUDE.md) <br> SubAgents分析代码库];
    B -- 否/新项目 --> D[主Agent直接了解需求];
    C --> E[主Agent给出初步实现总结];
    D --> E;
    E --> F[通过Chat反复确认需求细节];
    F --> G[形成完善的需求文档];
    G --> H[根据文档约束分配细粒度开发任务];

    subgraph 开发迭代循环
        direction TB
        I[组织批次SubAgents并行开发] --> J[验收SubAgents开发结果];
        J --> K[向用户报告、讨论新发现/实现];
        K --> L[根据讨论结果更新文档];
    end
    
    H --> I;
    L --> M{所有任务都已完成?};
    M -- 否 --> I[继续安排下一批次];
    M -- 是 --> N[Code Review];
    N --> O[Type Check];
    O --> P([完成]);