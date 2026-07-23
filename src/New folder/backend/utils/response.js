const success = (res, data, message = 'Thành công', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const error = (res, message = 'Lỗi hệ thống', statusCode = 500, err = null) => {
    const response = { success: false, message };
    if (process.env.NODE_ENV !== 'production' && err) {
        response.debug = err.message;
    }
    return res.status(statusCode).json(response);
};

module.exports = { success, error };
