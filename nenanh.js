const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function uploadAndCompressImage(fileUrl, inputFolder, randomString) {
  try {
    console.log(`Đang xử lý ảnh: ${fileUrl}`);

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
    const apiUrl = `https://imagecompressor.com/upload/${randomString}`;
    const response = await axios.post(apiUrl, formData, {
      headers: formData.getHeaders(),
    });

    const uploadedFileId = response.data.id;

    // Gửi yêu cầu GET thứ hai
    const rnd2 = Math.random().toFixed(16);
    const apiUrl2 = `https://imagecompressor.com/auto/${randomString}/${uploadedFileId}?rnd=${rnd2}`;
    await axios.get(apiUrl2);

    // Kiểm tra trạng thái nén ảnh
    let apiUrl3 = `https://imagecompressor.com/status/${randomString}/${uploadedFileId}?rnd=${Math.random().toFixed(
      16
    )}`;
    let response3;

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      response3 = await axios.get(apiUrl3);
      if (response3.data.status === "success") {
        break;
      }
      apiUrl3 = `https://imagecompressor.com/status/${randomString}/${uploadedFileId}?rnd=${Math.random().toFixed(
        16
      )}`;
    }

    // Tạo thư mục 'min' nếu chưa tồn tại
    const minFolderPath = path.join(inputFolder, "min");
    fs.mkdirSync(minFolderPath, { recursive: true });

    // Lấy và in kết quả cuối cùng
    const compressedFileName = response3.data.result;
    const downloadUrl = `https://imagecompressor.com/download/${randomString}/${uploadedFileId}/${compressedFileName}`;

    // Tải xuống và lưu tệp
    const response4 = await axios.get(downloadUrl, { responseType: "stream" });
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
  } catch (error) {
    console.error(`Lỗi khi tải lên và nén ảnh ${fileName}:`, error.message);
  }
}

const generateRandomString = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

async function main() {
  const inputFolder = process.argv[2];
  const numThreads = parseInt(process.argv[3], 10); // Lấy số luồng từ đối số thứ 3

  if (!inputFolder || isNaN(numThreads) || numThreads <= 0) {
    console.error(
      "Vui lòng cung cấp đường dẫn thư mục và số lượng luồng hợp lệ (số nguyên dương)."
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(inputFolder)
    .filter(
      (file) =>
        file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")
    );

  const randomString = generateRandomString(16);
  const fileUrls = files.map((file) => path.join(inputFolder, file));

  // Chia danh sách tệp thành các phần bằng nhau cho mỗi luồng
  const chunkSize = Math.ceil(fileUrls.length / numThreads);
  const fileChunks = Array.from({ length: numThreads }, (_, i) =>
    fileUrls.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  // Xử lý từng phần bằng một luồng riêng biệt
  await Promise.all(
    fileChunks.map((chunk) =>
      Promise.all(
        chunk.map((fileUrl) =>
          uploadAndCompressImage(fileUrl, inputFolder, randomString)
        )
      )
    )
  );
  console.log("Đã hoàn thành nén tất cả ảnh!");
  process.exit(0); 
}

main();
