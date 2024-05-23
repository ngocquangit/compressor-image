const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function uploadAndCompressImage(inputFolder) {
  try {
    const files = fs.readdirSync(inputFolder);

    // Lọc ra các tệp ảnh (có thể tùy chỉnh phần mở rộng)
    const imageFiles = files.filter(
      (file) =>
        file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")
    );

    // Tạo ID và rnd ngẫu nhiên
    const generateRandomString = (length) => {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
      return result;
    };
    for (const imageFile of imageFiles) {
      const fileUrl = path.join(inputFolder, imageFile);
      console.log(`Đang xử lý ảnh: ${imageFile}`);
      const id = `file_${generateRandomString(32)}`;
      const rnd = Math.random().toFixed(16);

      // Lấy tên tệp từ URL
      const fileName = fileUrl.split("/").pop();

      // Đọc tệp
      const fileStream = fs.createReadStream(fileUrl);

      // Tạo FormData
      const formData = new FormData();
      formData.append("file", fileStream, fileName);
      formData.append("id", id);
      formData.append("name", fileName);
      formData.append("rnd", rnd);

      // Gửi yêu cầu POST
      const randomString = generateRandomString(16);
      const apiUrl = `https://imagecompressor.com/upload/${randomString}`;
      const response = await axios.post(apiUrl, formData, {
        headers: formData.getHeaders(),
      });

      const uploadedFileId = response.data.id;
      // Gửi yêu cầu GET thứ hai
      const rnd2 = Math.random().toFixed(16);
      const apiUrl2 = `https://imagecompressor.com/auto/${randomString}/${uploadedFileId}?rnd=${rnd2}`;
      const response2 = await axios.get(apiUrl2);

      let apiUrl3 = `https://imagecompressor.com/status/${randomString}/${uploadedFileId}?rnd=${Math.random().toFixed(
        16
      )}`;
      let response3;

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Chờ 1 giây trước mỗi lần kiểm tra
        response3 = await axios.get(apiUrl3);
        if (response3.data.status === "success") {
          break; // Thoát vòng lặp khi thành công
        }
        const newRnd = Math.random().toFixed(16);
        apiUrl3 = `https://imagecompressor.com/status/${randomString}/${uploadedFileId}?rnd=${newRnd}`;
      }
      const minFolderPath = path.join(inputFolder, 'min');
      fs.mkdirSync(minFolderPath, { recursive: true });
      // Lấy và in kết quả cuối cùng
      const compressedFileName = response3.data.result;
      const downloadUrl = `https://imagecompressor.com/download/${randomString}/${uploadedFileId}/${compressedFileName}`;

      // Tải xuống và lưu tệp
      const response4 = await axios.get(downloadUrl, {
        responseType: "stream",
      });
      const writer = fs.createWriteStream(
        path.join(minFolderPath, compressedFileName.replace("-min", ""))
      );
      response4.data.pipe(writer);

      // Xác nhận khi tải xuống hoàn tất
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log(
        `Đã tải xuống và lưu tệp: ${compressedFileName} ${response3.data.savings}`
      );
    }
  } catch (error) {
    console.error(
      "Lỗi khi tải lên và nén ảnh:",
      compressedFileName + error.message
    );
  }
}

// Nhận URL tệp từ đối số dòng lệnh
const inputFolder = process.argv[2];
if (!inputFolder) {
  console.error("Vui lòng cung cấp URL tệp làm đối số.");
  process.exit(1);
}

uploadAndCompressImage(inputFolder);
