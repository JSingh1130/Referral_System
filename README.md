# Multi-Level Referral System

## Overview

The **Multi-Level Referral System** allows users to refer other users and earn commissions on their direct and indirect referrals. When a user makes a purchase, their referrers (Level 1 and Level 2) earn a percentage of the purchase amount.

This project is built using **Node.js**, **Express**, **MongoDB**, and **Socket.IO** for real-time updates.

---

## Features

* **User Registration**: Users can sign up and refer others.
* **Referral Tracking**: Users' referrals are tracked in the system.
* **Earnings Calculation**:

  * **Level 1 Earnings**: Direct referrals earn a 5% commission.
  * **Level 2 Earnings**: Indirect referrals earn a 1% commission.
* **Real-time Earnings Updates**: Using WebSockets, users see their earnings update in real-time as their referrals make purchases.
* **Admin Dashboard**: API to fetch detailed reports, breakdown of earnings across levels, and referrals.

---

## System Architecture

1. **Frontend**:

   * Built using plain **HTML**, **CSS**, and **JavaScript**.
   * Real-time earnings updates are received using **WebSocket** (Socket.IO).

2. **Backend**:

   * Built with **Node.js** and **Express** for API routes.
   * **MongoDB** is used as the database to store user information, referrals, and earnings.
   * **Socket.IO** is used for real-time communication (earnings updates).
   * **Mongoose** handles interactions with MongoDB.

3. **Database**:

   * **MongoDB** stores:

     * User details (name, email, referral history).
     * Earnings details (level 1 and level 2 earnings, total earnings).

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/multi-level-referral-system.git
cd multi-level-referral-system
```

### 2. Install Dependencies

First, ensure you have **Node.js** and **npm** installed. If not, you can download and install them from [here](https://nodejs.org/).

```bash
npm install
```

This will install all required dependencies as specified in the **`package.json`** file.

### 3. Set Up MongoDB

* If you're using **MongoDB Atlas** for cloud-based MongoDB, create a cluster and get your **Mongo URI**.
* If you're using **local MongoDB**, make sure it's running on **localhost**.

### 4. Configure Environment Variables

Create a **.env** file in the root of the project and add your MongoDB URI.

```bash
MONGO_URI=mongodb://<your-mongo-uri>
```

If you're using **MongoDB Atlas**, the URI will look like this:

```bash
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/multi_level_referral_system?retryWrites=true&w=majority
```

### 5. Start the Server

Run the following command to start the server:

```bash
npm start
```

This will run the server on **[http://localhost:3000](http://localhost:3000)**.

---

## API Endpoints

### 1. **Create User**

**POST** `/createUser`

Create a new user and optionally specify the **referredBy** field to track referrals.

**Request Body**:

```json
{
  "name": "User 1",
  "email": "user1@example.com",
  "referredBy": "referrer_user_id",
  "referralLevel": 0,
  "earnings": 0
}
```

**Response**:

```json
{
  "message": "User created successfully!"
}
```

---

### 2. **Get Earnings Report**

**GET** `/earningsReport/:userId`

Fetch the **earnings report** for a given user. This includes **Level 1** and **Level 2 earnings**.

**Example Request**:

`GET http://localhost:3000/earningsReport/6854b8979ce03a353debc028`

**Response**:

```json
{
  "userId": "6854b8979ce03a353debc028",
  "totalEarnings": 245,
  "level1Earnings": 245,
  "level2Earnings": 0,
  "earningsDetails": [
    {
      "amount": 245,
      "level": 1
    }
  ]
}
```

---

### 3. **Get Referral Earnings Breakdown**

**GET** `/referralEarningsBreakdown/:userId`

Fetch the earnings breakdown for all referrals (Level 1 and Level 2) of a user.

**Example Request**:

`GET http://localhost:3000/referralEarningsBreakdown/6854b8979ce03a353debc028`

**Response**:

```json
{
  "userId": "6854b8979ce03a353debc028",
  "referralEarnings": [
    {
      "userId": "6854dc15c04c389694f40ca0",
      "userName": "User 5",
      "referralLevel": 2,
      "earnings": 175
    }
  ]
}
```

---

### 4. **Purchase**

**POST** `/purchase`

When a user makes a purchase, their **referrer** (Level 1) and their **referrer’s referrer** (Level 2) will earn commissions.

**Request Body**:

```json
{
  "userId": "6854dc15c04c389694f40ca0",
  "purchaseAmount": 1700
}
```

**Response**:

```json
{
  "message": "Purchase processed and earnings updated!"
}
```

---



## Screenshots and Visuals
For detailed visuals of the project, including screenshots of the user interface and database, please refer to the images.pdf file included in the project.


## WebSocket Real-Time Earnings Updates

**Socket.IO** is used to send **real-time updates** to the frontend when earnings are updated.

**Backend Emission Example**:

```javascript
io.emit('earningsUpdate', { userId: userId, earnings: newEarnings, referralType: 'Level 1' });
```

The frontend listens for **`earningsUpdate`** events and updates the displayed earnings for the respective users.

---

## Frontend

### **`index.html`**

* The frontend fetches the **user details** and displays them.
* The **real-time earnings** are updated using **WebSocket**.
* **Charts** (if needed) are displayed based on the user earnings data.

---

## System Architecture

1. **Frontend**:

   * **WebSocket** (using **Socket.IO**) listens for updates.
   * **Chart.js** is used for visualizing earnings (optional, based on your requirement).
   * Fetches data from the **backend** to display **earnings reports** and **user details**.

2. **Backend**:

   * **Node.js** and **Express** for API routes.
   * **Socket.IO** for real-time communication.
   * **MongoDB** to store **user details**, **referrals**, and **earnings**.

3. **Database**:

   * **MongoDB** stores user data, referral relationships, and earnings.
   * **Mongoose** handles database interactions.

---

## Conclusion

This system enables multi-level marketing with referral-based earnings. When users make purchases, their referrers earn commissions, and the data is updated in real-time using WebSockets. This architecture scales well for further enhancement (e.g., adding more levels, integrating payment systems).
