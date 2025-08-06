import { cookie } from '../../../src/core';

describe('cookie', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { getHeader: jest.fn() };
    res = {};
  });

  it('should correctly parse cookies', async () => {
    req.getHeader.mockReturnValue('name=JohnDoe; session=abc123');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      name: 'JohnDoe',
      session: 'abc123',
    });
  });

  it('should return empty object if cookie header is missing', async () => {
    req.getHeader.mockReturnValue(undefined);

    await cookie(req, res);

    expect(req.cookies).toEqual({});
  });

  it('should return empty object if cookie header is an empty string', async () => {
    req.getHeader.mockReturnValue('');

    await cookie(req, res);

    expect(req.cookies).toEqual({});
  });

  it('should correctly handle multiple cookies', async () => {
    req.getHeader.mockReturnValue('theme=dark; lang=en; token=xyz');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      theme: 'dark',
      lang: 'en',
      token: 'xyz',
    });
  });

  it('should handle cookies with spaces correctly', async () => {
    req.getHeader.mockReturnValue('user=John Doe; city=New York');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      user: 'John Doe',
      city: 'New York',
    });
  });

  it('should decode URL-encoded cookie values', async () => {
    req.getHeader.mockReturnValue('city=New%20York; language=en%20US');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      city: 'New York',
      language: 'en US',
    });
  });

  it('should ignore malformed cookies', async () => {
    req.getHeader.mockReturnValue('valid=good; =bad; incomplete');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      valid: 'good',
    });
  });
});
