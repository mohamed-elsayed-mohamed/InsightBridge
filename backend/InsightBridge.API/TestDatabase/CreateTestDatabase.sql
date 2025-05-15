-- Create test database schema
USE TestAIDatabase;
GO

-- Create Customers table
CREATE TABLE Customers (
    CustomerID INT PRIMARY KEY,
    FirstName NVARCHAR(50),
    LastName NVARCHAR(50),
    Email NVARCHAR(100),
    Phone NVARCHAR(20),
    Address NVARCHAR(200),
    City NVARCHAR(50),
    State NVARCHAR(50),
    Country NVARCHAR(50),
    CreatedDate DATETIME DEFAULT GETDATE()
);

-- Create Products table
CREATE TABLE Products (
    ProductID INT PRIMARY KEY,
    ProductName NVARCHAR(100),
    Category NVARCHAR(50),
    UnitPrice DECIMAL(10,2),
    StockQuantity INT,
    Discontinued BIT DEFAULT 0
);

-- Create Orders table
CREATE TABLE Orders (
    OrderID INT PRIMARY KEY,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    OrderDate DATETIME,
    TotalAmount DECIMAL(10,2),
    Status NVARCHAR(20),
    PaymentMethod NVARCHAR(50)
);

-- Create OrderDetails table
CREATE TABLE OrderDetails (
    OrderDetailID INT PRIMARY KEY,
    OrderID INT FOREIGN KEY REFERENCES Orders(OrderID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    Quantity INT,
    UnitPrice DECIMAL(10,2),
    Discount DECIMAL(5,2)
);

-- Insert sample data
-- Customers
INSERT INTO Customers (CustomerID, FirstName, LastName, Email, Phone, Address, City, State, Country)
VALUES 
(1, 'John', 'Doe', 'john.doe@email.com', '555-0101', '123 Main St', 'New York', 'NY', 'USA'),
(2, 'Jane', 'Smith', 'jane.smith@email.com', '555-0102', '456 Oak Ave', 'Los Angeles', 'CA', 'USA'),
(3, 'Bob', 'Johnson', 'bob.johnson@email.com', '555-0103', '789 Pine Rd', 'Chicago', 'IL', 'USA'),
(4, 'Alice', 'Brown', 'alice.brown@email.com', '555-0104', '321 Elm St', 'Houston', 'TX', 'USA'),
(5, 'Charlie', 'Wilson', 'charlie.wilson@email.com', '555-0105', '654 Maple Dr', 'Miami', 'FL', 'USA');

-- Products
INSERT INTO Products (ProductID, ProductName, Category, UnitPrice, StockQuantity)
VALUES 
(1, 'Laptop Pro', 'Electronics', 1299.99, 50),
(2, 'Smartphone X', 'Electronics', 899.99, 100),
(3, 'Wireless Headphones', 'Electronics', 199.99, 75),
(4, 'Office Chair', 'Furniture', 299.99, 30),
(5, 'Desk Lamp', 'Furniture', 49.99, 60),
(6, 'Coffee Maker', 'Appliances', 79.99, 40),
(7, 'Blender', 'Appliances', 59.99, 25),
(8, 'Yoga Mat', 'Sports', 29.99, 100),
(9, 'Dumbbells Set', 'Sports', 89.99, 45),
(10, 'Running Shoes', 'Sports', 119.99, 80);

-- Orders
INSERT INTO Orders (OrderID, CustomerID, OrderDate, TotalAmount, Status, PaymentMethod)
VALUES 
(1, 1, '2024-01-15', 1499.98, 'Completed', 'Credit Card'),
(2, 2, '2024-01-16', 899.99, 'Completed', 'PayPal'),
(3, 3, '2024-01-17', 599.97, 'Processing', 'Credit Card'),
(4, 4, '2024-01-18', 349.98, 'Completed', 'Debit Card'),
(5, 5, '2024-01-19', 209.97, 'Shipped', 'Credit Card'),
(6, 1, '2024-01-20', 79.99, 'Completed', 'PayPal'),
(7, 2, '2024-01-21', 179.98, 'Processing', 'Credit Card'),
(8, 3, '2024-01-22', 89.99, 'Completed', 'Debit Card'),
(9, 4, '2024-01-23', 119.99, 'Shipped', 'Credit Card'),
(10, 5, '2024-01-24', 299.99, 'Completed', 'PayPal');

-- OrderDetails
INSERT INTO OrderDetails (OrderDetailID, OrderID, ProductID, Quantity, UnitPrice, Discount)
VALUES 
(1, 1, 1, 1, 1299.99, 0),
(2, 1, 3, 1, 199.99, 0),
(3, 2, 2, 1, 899.99, 0),
(4, 3, 3, 3, 199.99, 0),
(5, 4, 4, 1, 299.99, 0),
(6, 4, 5, 1, 49.99, 0),
(7, 5, 6, 1, 79.99, 0),
(8, 5, 7, 1, 59.99, 0),
(9, 5, 8, 1, 29.99, 0),
(10, 6, 6, 1, 79.99, 0),
(11, 7, 8, 2, 29.99, 0),
(12, 7, 9, 1, 89.99, 0),
(13, 8, 9, 1, 89.99, 0),
(14, 9, 10, 1, 119.99, 0),
(15, 10, 4, 1, 299.99, 0);

-- Create a view for sales analysis
CREATE VIEW SalesAnalysis AS
SELECT 
    c.CustomerID,
    c.FirstName + ' ' + c.LastName AS CustomerName,
    p.ProductID,
    p.ProductName,
    p.Category,
    o.OrderDate,
    od.Quantity,
    od.UnitPrice,
    od.Discount,
    (od.Quantity * od.UnitPrice * (1 - od.Discount/100)) AS TotalAmount
FROM Customers c
JOIN Orders o ON c.CustomerID = o.CustomerID
JOIN OrderDetails od ON o.OrderID = od.OrderID
JOIN Products p ON od.ProductID = p.ProductID;

-- Create a stored procedure for customer purchase history
CREATE PROCEDURE GetCustomerPurchaseHistory
    @CustomerID INT
AS
BEGIN
    SELECT 
        o.OrderDate,
        p.ProductName,
        od.Quantity,
        od.UnitPrice,
        (od.Quantity * od.UnitPrice * (1 - od.Discount/100)) AS TotalAmount
    FROM Orders o
    JOIN OrderDetails od ON o.OrderID = od.OrderID
    JOIN Products p ON od.ProductID = p.ProductID
    WHERE o.CustomerID = @CustomerID
    ORDER BY o.OrderDate DESC;
END; 