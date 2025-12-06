module.exports = function certificateHTML({ username, courseName, score, issueDate, logoUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      text-align: center;
      color: #333;
    }
    .cert-box {
      border: 3px solid #6a00ff;
      padding: 40px;
      border-radius: 12px;
    }
    .logo {
      width: 180px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #6a00ff;
    }
    .username {
      font-size: 26px;
      font-weight: bold;
      margin: 10px 0;
    }
    .course {
      font-size: 20px;
      margin: 10px 0;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="cert-box">
    <img src="${logoUrl}" class="logo" />
    <h1>Eduoding Certificate</h1>
    <p>This certifies that</p>

    <div class="username">${username}</div>

    <p>has successfully completed the course</p>

    <div class="course">"${courseName}"</div>

    <p>Score: ${score}%</p>
    <p>Issued on: ${issueDate}</p>

    <div class="footer">
      Practical learning. Real projects. — Eduoding
    </div>
  </div>
</body>
</html>`;
};
