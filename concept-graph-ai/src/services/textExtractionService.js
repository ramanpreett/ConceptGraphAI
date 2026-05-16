import axios from 'axios';

import { API_BASE_URL } from '../config/api';

export const extractTextFromFile = async (filename, mimetype) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/extract`, {
      filename,
      mimetype,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      'Failed to extract text from file'
    );
  }
};

export const uploadAndExtract = async (file, onUploadProgress) => {
  try {
    // Step 1: Upload file
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      }
    );

    if (!uploadResponse.data.success) {
      throw new Error('Upload failed');
    }

    const fileInfo = uploadResponse.data.file;

    // Step 2: Extract text
    const extractResponse = await extractTextFromFile(
      fileInfo.filename,
      fileInfo.mimetype
    );

    return {
      upload: fileInfo,
      extraction: extractResponse.data,
    };
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      'Failed to upload and extract'
    );
  }
};
