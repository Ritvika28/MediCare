import { jest } from '@jest/globals';
import { getPublicIdFromUrl, cloudinary } from '../src/config/cloudinary.js';
import { Writable } from 'stream';

describe('Cloudinary Integration', () => {
  beforeAll(() => {
    // Configure with mock keys so the library does not throw "Must supply api_key"
    cloudinary.config({
      cloud_name: 'medicare',
      api_key: '999252869635921',
      api_secret: 'Apb58DUsBlbFL7AV90JPv1ttvW0'
    });

    // Spy on cloudinary.uploader methods
    jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((options, callback) => {
      const stream = new Writable({
        write(chunk, encoding, next) {
          next();
        }
      });
      process.nextTick(() => {
        stream.emit('finish');
        callback(null, {
          secure_url: `https://res.cloudinary.com/medicare/image/upload/v123456/${options.folder || 'test'}/mockfile.jpg`,
          public_id: `${options.folder || 'test'}/mockfile`
        });
      });
      return stream;
    });

    jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('getPublicIdFromUrl', () => {
    it('should correctly parse standard Cloudinary URLs with versions', () => {
      const url = 'https://res.cloudinary.com/medicare/image/upload/v1719602521/medical-records/my-report.png';
      expect(getPublicIdFromUrl(url)).toBe('medical-records/my-report');
    });

    it('should correctly parse standard Cloudinary URLs without versions', () => {
      const url = 'https://res.cloudinary.com/medicare/image/upload/medical-records/my-report.png';
      expect(getPublicIdFromUrl(url)).toBe('medical-records/my-report');
    });

    it('should return null for invalid or non-Cloudinary URLs', () => {
      expect(getPublicIdFromUrl('http://localhost:5001/uploads/test.png')).toBeNull();
      expect(getPublicIdFromUrl('')).toBeNull();
      expect(getPublicIdFromUrl(null)).toBeNull();
    });
  });

  describe('Cloudinary Upload Mocking', () => {
    it('should upload via stream in simulation', async () => {
      const buffer = Buffer.from('hello-world');
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'prescriptions' },
          (err, res) => {
            if (err) reject(err);
            else resolve(res);
          }
        );
        stream.end(buffer);
      });

      expect(uploadResult.secure_url).toContain('https://res.cloudinary.com/medicare/image/upload/');
      expect(uploadResult.public_id).toBe('prescriptions/mockfile');
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { folder: 'prescriptions' },
        expect.any(Function)
      );
    });

    it('should call destroy on deletion', async () => {
      const res = await cloudinary.uploader.destroy('prescriptions/mockfile');
      expect(res.result).toBe('ok');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('prescriptions/mockfile');
    });
  });
});
