IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE TABLE [BacklogItems] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(2000) NOT NULL,
        [Category] nvarchar(max) NOT NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        [EstimatedHours] int NULL,
        CONSTRAINT [PK_BacklogItems] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Role] nvarchar(max) NOT NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE TABLE [WeeklyPlans] (
        [Id] uniqueidentifier NOT NULL,
        [WeekStartDate] datetime2 NOT NULL,
        [WeekEndDate] datetime2 NOT NULL,
        [ClientPercent] decimal(5,2) NOT NULL,
        [TechDebtPercent] decimal(5,2) NOT NULL,
        [RDPercent] decimal(5,2) NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [FrozenAt] datetime2 NULL,
        [CompletedAt] datetime2 NULL,
        CONSTRAINT [PK_WeeklyPlans] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE TABLE [WeeklyPlanTasks] (
        [Id] uniqueidentifier NOT NULL,
        [WeeklyPlanId] uniqueidentifier NOT NULL,
        [BacklogItemId] uniqueidentifier NOT NULL,
        [AssignedUserId] uniqueidentifier NOT NULL,
        [PlannedHours] decimal(5,2) NOT NULL,
        [CompletedHours] decimal(5,2) NOT NULL DEFAULT 0.0,
        [Status] int NOT NULL,
        CONSTRAINT [PK_WeeklyPlanTasks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WeeklyPlanTasks_BacklogItems_BacklogItemId] FOREIGN KEY ([BacklogItemId]) REFERENCES [BacklogItems] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_WeeklyPlanTasks_Users_AssignedUserId] FOREIGN KEY ([AssignedUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_WeeklyPlanTasks_WeeklyPlans_WeeklyPlanId] FOREIGN KEY ([WeeklyPlanId]) REFERENCES [WeeklyPlans] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE INDEX [IX_Users_Name] ON [Users] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE INDEX [IX_WeeklyPlanTasks_AssignedUserId] ON [WeeklyPlanTasks] ([AssignedUserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE INDEX [IX_WeeklyPlanTasks_BacklogItemId] ON [WeeklyPlanTasks] ([BacklogItemId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    CREATE INDEX [IX_WeeklyPlanTasks_WeeklyPlanId_AssignedUserId] ON [WeeklyPlanTasks] ([WeeklyPlanId], [AssignedUserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260303122051_InitialGuidSchema'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260303122051_InitialGuidSchema', N'8.0.14');
END;
GO

COMMIT;
GO

