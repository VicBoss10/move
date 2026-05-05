/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

/**
 * Test suite para ApiService
 *
 * Cubre:
 * - Creación e inyección de dependencias
 * - Métodos HTTP básicos (GET, POST, PUT, DELETE)
 * - Métodos de respuesta en texto (getText, postText, putText, deleteText)
 * - Métodos para URLs absolutas (getAbsolute, postAbsolute)
 * - Manejo de errores HTTP y de red
 * - Observable error$ y emisión de errores
 * - Construcción correcta de URLs con base URL
 */
describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct default API URL', () => {
    expect(service.getApiUrl()).toBe(apiBaseUrl);
  });

  describe('get()', () => {
    it('should make GET request to endpoint with correct URL', (done) => {
      const endpoint = '/users';
      const mockData = [{ id: 1, name: 'John' }];

      service.get(endpoint).subscribe((data) => {
        expect(data).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('should support query parameters as object', (done) => {
      const endpoint = '/users/search';
      const params = { role: 'ADMIN', keyword: 'john' };

      service.get(endpoint, params).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes(endpoint));
      expect(req.request.params.get('role')).toBe('ADMIN');
      expect(req.request.params.get('keyword')).toBe('john');
      req.flush([]);
      done();
    });

    it('should emit error through error$ on GET failure', (done) => {
      const endpoint = '/users';
      let errorEmitted = false;

      service.error$.subscribe((error) => {
        if (error) {
          errorEmitted = true;
          expect(error).toContain('404');
        }
      });

      service.get(endpoint).subscribe({
        error: (err) => {
          expect(err.status).toBe(404);
          expect(errorEmitted).toBe(true);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('post()', () => {
    it('should make POST request with body', (done) => {
      const endpoint = '/users';
      const body = { username: 'newuser', email: 'user@example.com' };
      const mockResponse = { id: 5, ...body };

      service.post(endpoint, body).subscribe((data) => {
        expect(data).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle POST error with status code', (done) => {
      const endpoint = '/users';
      const body = { invalid: 'data' };

      service.post(endpoint, body).subscribe({
        error: (err) => {
          expect(err.status).toBe(400);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle POST client-side error', (done) => {
      const endpoint = '/users';

      service.post(endpoint, {}).subscribe({
        error: (err) => {
          expect(err.message).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush(null, { status: 0, statusText: 'Unknown Error' });
    });
  });

  describe('postText()', () => {
    it('should make POST request expecting text response', (done) => {
      const endpoint = '/export';
      const mockResponse = 'Export completed successfully';

      service.postText(endpoint, {}).subscribe((data) => {
        expect(data).toBe(mockResponse);
        expect(typeof data).toBe('string');
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.responseType).toBe('text');
      req.flush(mockResponse);
    });

    it('should handle postText error', (done) => {
      const endpoint = '/export';

      service.postText(endpoint, {}).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getText()', () => {
    it('should make GET request expecting text response', (done) => {
      const endpoint = '/data/export';
      const mockResponse = 'Some text content';

      service.getText(endpoint).subscribe((data) => {
        expect(data).toBe(mockResponse);
        expect(typeof data).toBe('string');
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.responseType).toBe('text');
      req.flush(mockResponse);
    });

    it('should support parameters with getText', (done) => {
      const endpoint = '/data/export';
      const params = { format: 'csv' };

      service.getText(endpoint, params).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes(endpoint));
      expect(req.request.params.get('format')).toBe('csv');
      req.flush('');
      done();
    });
  });

  describe('put()', () => {
    it('should make PUT request with body', (done) => {
      const endpoint = '/users/5';
      const body = { username: 'updateduser' };
      const mockResponse = { id: 5, ...body };

      service.put(endpoint, body).subscribe((data) => {
        expect(data).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle PUT error', (done) => {
      const endpoint = '/users/5';

      service.put(endpoint, {}).subscribe({
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('putText()', () => {
    it('should make PUT request expecting text response', (done) => {
      const endpoint = '/config';
      const body = { setting: 'value' };
      const mockResponse = 'Configuration updated';

      service.putText(endpoint, body).subscribe((data) => {
        expect(data).toBe(mockResponse);
        expect(typeof data).toBe('string');
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.responseType).toBe('text');
      req.flush(mockResponse);
    });
  });

  describe('delete()', () => {
    it('should make DELETE request', (done) => {
      const endpoint = '/users/5';
      const mockResponse = { success: true };

      service.delete(endpoint).subscribe((data) => {
        expect(data).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle DELETE error with 404', (done) => {
      const endpoint = '/users/999';

      service.delete(endpoint).subscribe({
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle DELETE error with 500', (done) => {
      const endpoint = '/users/5';

      service.delete(endpoint).subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('deleteText()', () => {
    it('should make DELETE request expecting text response', (done) => {
      const endpoint = '/data';
      const mockResponse = 'Data deleted successfully';

      service.deleteText(endpoint).subscribe((data) => {
        expect(data).toBe(mockResponse);
        expect(typeof data).toBe('string');
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.responseType).toBe('text');
      req.flush(mockResponse);
    });
  });

  describe('getAbsolute()', () => {
    it('should make GET request to absolute URL without prepending base URL', (done) => {
      const fullUrl = 'https://external-api.com/data';
      const mockResponse = { external: 'data' };

      service.getAbsolute(fullUrl).subscribe((data) => {
        expect(data).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(fullUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should support query parameters with absolute URL', (done) => {
      const fullUrl = 'https://external-api.com/search';
      const params = { q: 'test' };

      service.getAbsolute(fullUrl, params).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('external-api.com'));
      expect(req.request.params.get('q')).toBe('test');
      req.flush([]);
      done();
    });

    it('should handle error on absolute GET', (done) => {
      const fullUrl = 'https://external-api.com/data';

      service.getAbsolute(fullUrl).subscribe({
        error: (err) => {
          expect(err.status).toBe(503);
          done();
        },
      });

      const req = httpMock.expectOne(fullUrl);
      req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    });
  });

  describe('postAbsolute()', () => {
    it('should make POST request to absolute URL', (done) => {
      const fullUrl = 'https://external-api.com/submit';
      const body = { data: 'test' };
      const mockResponse = { success: true };

      service.postAbsolute(fullUrl, body).subscribe((data) => {
        expect(data).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(fullUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle error on absolute POST', (done) => {
      const fullUrl = 'https://external-api.com/submit';

      service.postAbsolute(fullUrl, {}).subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          done();
        },
      });

      const req = httpMock.expectOne(fullUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('error$ observable', () => {
    it('should emit null initially', (done) => {
      let emissionCount = 0;
      service.error$.subscribe((error) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(error).toBeNull();
          done();
        }
      });
    });

    it('should emit error message when request fails', (done) => {
      const endpoint = '/test';
      let errorEmitted = false;

      service.error$.subscribe((error) => {
        if (error) {
          errorEmitted = true;
          expect(error).toContain('Error');
        }
      });

      service.get(endpoint).subscribe({
        error: () => {
          expect(errorEmitted).toBe(true);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Test error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should emit different error messages for different requests', (done) => {
      const endpoint1 = '/test1';
      const endpoint2 = '/test2';
      const errors: (string | null)[] = [];

      service.error$.subscribe((error) => {
        errors.push(error);
      });

      service.get(endpoint1).subscribe({
        error: () => {
          service.get(endpoint2).subscribe({
            error: () => {
              expect(errors.length).toBeGreaterThan(1);
              done();
            },
          });

          const req2 = httpMock.expectOne(`${apiBaseUrl}${endpoint2}`);
          req2.flush('Error 2', { status: 502, statusText: 'Bad Gateway' });
        },
      });

      const req1 = httpMock.expectOne(`${apiBaseUrl}${endpoint1}`);
      req1.flush('Error 1', { status: 501, statusText: 'Not Implemented' });
    });
  });

  describe('error handling', () => {
    it('should emit error$ on HttpErrorResponse', (done) => {
      const endpoint = '/test';
      let errorEmitted = false;

      service.error$.subscribe((error) => {
        if (error) {
          errorEmitted = true;
        }
      });

      service.get(endpoint).subscribe({
        error: () => {
          expect(errorEmitted).toBe(true);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should attach status code to propagated error', (done) => {
      const endpoint = '/test';

      service.get(endpoint).subscribe({
        error: (err) => {
          expect(err.status).toBe(403);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should attach error details to propagated error', (done) => {
      const endpoint = '/test';
      const errorBody = { message: 'Validation failed', code: 'VAL_001' };

      service.get(endpoint).subscribe({
        error: (err) => {
          expect(err.details).toEqual(errorBody);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush(errorBody, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('should handle client-side network error', (done) => {
      const endpoint = '/test';

      service.get(endpoint).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      req.flush(null, { status: 0, statusText: 'Network Error' });
    });
  });

  describe('getApiUrl()', () => {
    it('should return configured API URL', () => {
      const url = service.getApiUrl();
      expect(url).toBe(apiBaseUrl);
    });

    it('should return string with http protocol', () => {
      expect(typeof service.getApiUrl()).toBe('string');
      expect(service.getApiUrl().startsWith('http')).toBe(true);
    });
  });

  describe('URL construction', () => {
    it('should prepend base URL to endpoint paths', (done) => {
      const endpoint = '/devices/123';

      service.get(endpoint).subscribe();

      const req = httpMock.expectOne(`${apiBaseUrl}${endpoint}`);
      expect(req.request.url).toBe(`${apiBaseUrl}${endpoint}`);
      req.flush({});
      done();
    });

    it('should not prepend base URL for absolute URLs', (done) => {
      const fullUrl = 'https://external-api.com/data';

      service.getAbsolute(fullUrl).subscribe();

      const req = httpMock.expectOne(fullUrl);
      expect(req.request.url).toBe(fullUrl);
      req.flush({});
      done();
    });
  });
});
