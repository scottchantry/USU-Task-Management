CREATE TABLE Session (
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


CREATE TABLE Users (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    canvasUserID INT,
    CONSTRAINT PK_Users PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE Groups (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    canvasGroupID INT,
    CONSTRAINT PK_Groups PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE Course (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    canvasCourseID INT,
    CONSTRAINT PK_Course PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE CourseMembership (
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

CREATE TABLE GroupMembership (
    id INT IDENTITY(1,1) NOT NULL,
    userID INT NOT NULL,
    groupID INT NOT NULL,
    CONSTRAINT PK_GroupMembership PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO

CREATE TABLE Assignment (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    courseID INT NOT NULL,
    canvasAssignmentID INT NOT NULL,
    CONSTRAINT PK_Assignment PRIMARY KEY CLUSTERED
    (
        id
    )
);
GO
