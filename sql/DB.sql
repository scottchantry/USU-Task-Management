--Tasks
CREATE TABLE [Tasks] (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    canvasAssignmentID INT NOT NULL,
    startDate DATE NOT NULL, --'YYYY-MM-DD'
    endDate DATE NOT NULL, --'YYYY-MM-DD'
    canvasGroupID INT,
    groupTask BIT NOT NULL, --1 yes, 0 no
    CONSTRAINT PK_Tasks PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE [TaskAssignments] (
    id INT IDENTITY(1,1) NOT NULL,
    taskID INT NOT NULL,
    canvasUserID INT,
    status TINYINT NOT NULL, --1 Not Started, 2 In-Progress, 3 Completed
    CONSTRAINT PK_TaskAssignments PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

--Discussions
CREATE TABLE [Discussions] (
    id INT IDENTITY(1,1) NOT NULL,
    created DATETIME2 NOT NULL DEFAULT GETDATE(),
    text NTEXT NOT NULL,
    canvasGroupID INT,
    taskID INT,
    CONSTRAINT PK_Discussions PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO
--Rubrics




/*CREATE TABLE [Sessions] (
    id NVARCHAR(255) NOT NULL,
    created DATETIME NOT NULL,
    userID INT NOT NULL,
    courseID INT NOT NULL,
    roleID INT NOT NULL,
    assignmentID INT NOT NULL,
    groupID INT,
    CONSTRAINT PK_Session PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO


CREATE TABLE [Users] (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    canvasUserID INT,
    CONSTRAINT PK_Users PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE [Groups] (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    courseID INT NOT NULL,
    canvasGroupID INT,
    CONSTRAINT PK_Groups PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE [Courses] (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    canvasCourseID INT,
    CONSTRAINT PK_Course PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE [CourseMemberships] (
    id INT IDENTITY(1,1) NOT NULL,
    userID INT NOT NULL,
    courseID INT NOT NULL,
    roleID INT NOT NULL, --1 Instructor, 2 Student
    CONSTRAINT PK_CourseMembership PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE [GroupMemberships] (
    id INT IDENTITY(1,1) NOT NULL,
    userID INT NOT NULL,
    groupID INT NOT NULL,
    CONSTRAINT PK_GroupMembership PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE [Assignments] (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    courseID INT NOT NULL,
    canvasAssignmentID INT NOT NULL,
    CONSTRAINT PK_Assignment PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO*/
