import {
  flash,
  FLASH_GET_KEY,
  FLASH_SET_KEY,
} from '../../../src/core/middlewares/flash';

describe('flash middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      cookies: {},
      [FLASH_GET_KEY]: undefined,
      [FLASH_SET_KEY]: undefined,
    };

    const forget = jest.fn();

    res = { cookie: jest.fn().mockReturnValue({ forget }) };
  });

  it('should parse valid flash cookie and store in req[FLASH_GET_KEY]', async () => {
    req.cookies.flash = JSON.stringify(['msg1', 'msg2']);

    await flash(req, res);

    expect(req[FLASH_GET_KEY]).toEqual(['msg1', 'msg2']);
    expect(req[FLASH_SET_KEY]).toEqual([]);
    expect(res.cookie().forget).toHaveBeenCalledWith('flash');
  });

  it('should handle invalid JSON gracefully', async () => {
    req.cookies.flash = 'not-valid-json';

    await flash(req, res);

    expect(req[FLASH_GET_KEY]).toEqual([]);
    expect(req[FLASH_SET_KEY]).toEqual([]);
    expect(res.cookie().forget).not.toHaveBeenCalledWith('flash');
  });

  it('should handle missing flash cookie', async () => {
    req.cookies = undefined;

    await flash(req, res);

    expect(req[FLASH_GET_KEY]).toEqual([]);
    expect(req[FLASH_SET_KEY]).toEqual([]);
    expect(res.cookie().forget).not.toHaveBeenCalledWith('flash');
  });

  it('should ignore non-array flash data', async () => {
    req.cookies.flash = JSON.stringify({ message: 'hello' });

    await flash(req, res);

    expect(req[FLASH_GET_KEY]).toEqual([]);
    expect(req[FLASH_SET_KEY]).toEqual([]);
    expect(res.cookie().forget).not.toHaveBeenCalledWith('flash');
  });
});
