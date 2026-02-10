const mongoose = require('mongoose');

const koiSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Mã định danh (VD: WEMEPET-001)
  name: String, // Tên (VD: Maruten Kohaku)
  breeder: String, // Trại (VD: Sakai)
  size: Number, // Kích thước (cm)
  year: Number, // Năm sinh
  img: String, // Link ảnh
  description: String, // Mô tả thêm
});

const Koi = mongoose.model('Koi', koiSchema);
module.exports = Koi;
