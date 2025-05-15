-- Drop existing tables if they exist
IF OBJECT_ID('dbo.OrderDetails', 'U') IS NOT NULL DROP TABLE dbo.OrderDetails;
IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL DROP TABLE dbo.Customers;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Sales', 'U') IS NOT NULL DROP TABLE dbo.Sales;
IF OBJECT_ID('dbo.Attendance', 'U') IS NOT NULL DROP TABLE dbo.Attendance;
IF OBJECT_ID('dbo.Salaries', 'U') IS NOT NULL DROP TABLE dbo.Salaries;
IF OBJECT_ID('dbo.Projects', 'U') IS NOT NULL DROP TABLE dbo.Projects;
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL DROP TABLE dbo.Employees;
IF OBJECT_ID('dbo.Departments', 'U') IS NOT NULL DROP TABLE dbo.Departments;
GO

-- Create TestAIDatabase
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TestAIDatabase')
BEGIN
    CREATE DATABASE TestAIDatabase;
END
GO

USE TestAIDatabase;
GO

-- Create Departments table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Departments')
BEGIN
    CREATE TABLE Departments (
        DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL
    );
END
GO

-- Create Employees table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees')
BEGIN
    CREATE TABLE Employees (
        EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(50),
        LastName NVARCHAR(50),
        DepartmentID INT,
        HireDate DATE,
        Email NVARCHAR(100),
        Gender NVARCHAR(10),
        BirthDate DATE,
        CONSTRAINT FK_Employees_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
    );
END
GO

-- Create Projects table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
BEGIN
    CREATE TABLE Projects (
        ProjectID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100),
        StartDate DATE,
        EndDate DATE,
        Budget DECIMAL(18,2)
    );
END
GO

-- Create Salaries table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Salaries')
BEGIN
    CREATE TABLE Salaries (
        SalaryID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT,
        Amount DECIMAL(18,2),
        EffectiveDate DATE,
        CONSTRAINT FK_Salaries_Employees FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
    );
END
GO

-- Create Attendance table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attendance')
BEGIN
    CREATE TABLE Attendance (
        AttendanceID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT,
        Date DATE,
        Status NVARCHAR(20), -- Present, Absent, Late, etc.
        CONSTRAINT FK_Attendance_Employees FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
    );
END
GO

-- Create Products table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
BEGIN
    CREATE TABLE Products (
        ProductID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100),
        Category NVARCHAR(50),
        Price DECIMAL(10,2)
    );
END
GO

-- Create Customers table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        CustomerID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100),
        Email NVARCHAR(100),
        City NVARCHAR(50)
    );
END
GO

-- Create Orders table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        CustomerID INT,
        OrderDate DATE,
        TotalAmount DECIMAL(18,2),
        CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)
    );
END
GO

-- Create OrderDetails table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderDetails')
BEGIN
    CREATE TABLE OrderDetails (
        OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT,
        ProductID INT,
        Quantity INT,
        UnitPrice DECIMAL(10,2),
        CONSTRAINT FK_OrderDetails_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
        CONSTRAINT FK_OrderDetails_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
    );
END
GO

-- Create Sales table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Sales')
BEGIN
    CREATE TABLE Sales (
        SaleID INT IDENTITY(1,1) PRIMARY KEY,
        ProductID INT,
        SaleDate DATE,
        Quantity INT,
        Amount DECIMAL(18,2),
        Region NVARCHAR(50),
        CONSTRAINT FK_Sales_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
    );
END
GO

-- Populate Departments
INSERT INTO Departments (Name)
VALUES ('HR'), ('IT'), ('Finance'), ('Sales'), ('Marketing'), ('Operations'), ('R&D'), ('Support');

-- Populate Products
DECLARE @i INT = 1;
WHILE @i <= 100
BEGIN
    INSERT INTO Products (Name, Category, Price)
    VALUES (
        CONCAT('Product ', @i),
        CASE WHEN @i % 4 = 0 THEN 'Electronics' WHEN @i % 4 = 1 THEN 'Clothing' WHEN @i % 4 = 2 THEN 'Books' ELSE 'Home' END,
        ROUND(RAND() * 100 + 10, 2)
    );
    SET @i = @i + 1;
END

-- Populate Customers
SET @i = 1;
WHILE @i <= 500
BEGIN
    INSERT INTO Customers (Name, Email, City)
    VALUES (
        CONCAT('Customer ', @i),
        CONCAT('customer', @i, '@example.com'),
        CASE WHEN @i % 5 = 0 THEN 'New York' WHEN @i % 5 = 1 THEN 'London' WHEN @i % 5 = 2 THEN 'Paris' WHEN @i % 5 = 3 THEN 'Berlin' ELSE 'Tokyo' END
    );
    SET @i = @i + 1;
END

-- Populate Employees
SET @i = 1;
WHILE @i <= 200
BEGIN
    INSERT INTO Employees (FirstName, LastName, DepartmentID, HireDate, Email, Gender, BirthDate)
    VALUES (
        CONCAT('First', @i),
        CONCAT('Last', @i),
        ((@i - 1) % 8) + 1,
        DATEADD(DAY, -1 * (ABS(CHECKSUM(NEWID())) % 3650), GETDATE()),
        CONCAT('employee', @i, '@company.com'),
        CASE WHEN @i % 2 = 0 THEN 'Male' ELSE 'Female' END,
        DATEADD(YEAR, -1 * (20 + (@i % 25)), GETDATE())
    );
    SET @i = @i + 1;
END

-- Populate Projects
SET @i = 1;
WHILE @i <= 30
BEGIN
    INSERT INTO Projects (Name, StartDate, EndDate, Budget)
    VALUES (
        CONCAT('Project ', @i),
        DATEADD(DAY, -1 * (ABS(CHECKSUM(NEWID())) % 2000), GETDATE()),
        DATEADD(DAY, (ABS(CHECKSUM(NEWID())) % 1000), GETDATE()),
        ROUND(RAND() * 100000 + 5000, 2)
    );
    SET @i = @i + 1;
END

-- Populate Salaries
SET @i = 1;
WHILE @i <= 200
BEGIN
    INSERT INTO Salaries (EmployeeID, Amount, EffectiveDate)
    VALUES (
        @i,
        ROUND(RAND() * 5000 + 3000, 2),
        DATEADD(MONTH, -1 * (@i % 36), GETDATE())
    );
    SET @i = @i + 1;
END

-- Populate Attendance
SET @i = 1;
DECLARE @j INT;
WHILE @i <= 200
BEGIN
    SET @j = 1;
    WHILE @j <= 30
    BEGIN
        INSERT INTO Attendance (EmployeeID, Date, Status)
        VALUES (
            @i,
            DATEADD(DAY, -@j, GETDATE()),
            CASE WHEN @j % 7 = 0 THEN 'Absent' WHEN @j % 6 = 0 THEN 'Late' ELSE 'Present' END
        );
        SET @j = @j + 1;
    END
    SET @i = @i + 1;
END

-- Populate Orders and OrderDetails
SET @i = 1;
DECLARE @custId INT;
DECLARE @orderDate DATE;
DECLARE @orderId INT;
DECLARE @numDetails INT;
DECLARE @orderTotal DECIMAL(18,2);
DECLARE @prodId INT;
DECLARE @qty INT;
DECLARE @unitPrice DECIMAL(10,2);
WHILE @i <= 2000
BEGIN
    SET @custId = ((@i - 1) % 500) + 1;
    SET @orderDate = DATEADD(DAY, -1 * (ABS(CHECKSUM(NEWID())) % 365), GETDATE());
    INSERT INTO Orders (CustomerID, OrderDate, TotalAmount)
    VALUES (@custId, @orderDate, 0);
    SET @orderId = SCOPE_IDENTITY();
    SET @numDetails = (ABS(CHECKSUM(NEWID())) % 5) + 1;
    SET @j = 1;
    SET @orderTotal = 0;
    WHILE @j <= @numDetails
    BEGIN
        SET @prodId = ((@i * @j) % 100) + 1;
        SET @qty = (ABS(CHECKSUM(NEWID())) % 10) + 1;
        SET @unitPrice = (SELECT Price FROM Products WHERE ProductID = @prodId);
        INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice)
        VALUES (@orderId, @prodId, @qty, @unitPrice);
        SET @orderTotal = @orderTotal + (@qty * @unitPrice);
        SET @j = @j + 1;
    END
    UPDATE Orders SET TotalAmount = @orderTotal WHERE OrderID = @orderId;
    SET @i = @i + 1;
END

-- Populate Sales
SET @i = 1;
-- @prodId already declared above
WHILE @i <= 5000
BEGIN
    SET @prodId = ((@i - 1) % 100) + 1;
    INSERT INTO Sales (ProductID, SaleDate, Quantity, Amount, Region)
    VALUES (
        @prodId,
        DATEADD(DAY, -1 * (ABS(CHECKSUM(NEWID())) % 730), GETDATE()),
        (ABS(CHECKSUM(NEWID())) % 20) + 1,
        ROUND(RAND() * 1000 + 50, 2),
        CASE WHEN @i % 4 = 0 THEN 'North America' WHEN @i % 4 = 1 THEN 'Europe' WHEN @i % 4 = 2 THEN 'Asia' ELSE 'Africa' END
    );
    SET @i = @i + 1;
END
GO

-- Create Users table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL,
        Email NVARCHAR(100) NOT NULL,
        PasswordHash NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
END

-- Create Reports table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reports')
BEGIN
    CREATE TABLE Reports (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(MAX),
        CreatedBy INT FOREIGN KEY REFERENCES Users(Id),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
END

-- Create DataSources table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DataSources')
BEGIN
    CREATE TABLE DataSources (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        ConnectionString NVARCHAR(MAX) NOT NULL,
        Type NVARCHAR(50) NOT NULL,
        CreatedBy INT FOREIGN KEY REFERENCES Users(Id),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
END 