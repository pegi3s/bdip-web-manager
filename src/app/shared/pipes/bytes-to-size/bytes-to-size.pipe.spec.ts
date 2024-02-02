import { BytesToSizePipe } from './bytes-to-size.pipe';
import { TestBed } from '@angular/core/testing';

describe('BytesToSizePipe', () => {
  let pipe: BytesToSizePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BytesToSizePipe]
    });
    pipe = TestBed.inject(BytesToSizePipe);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should correctly transform Bytes', () => {
    expect(pipe.transform(500)).toBe('500 Bytes');
  });

  it('should correctly transform KiB', () => {
    expect(pipe.transform(1024)).toBe('1 KiB');
  });

  it('should correctly transform MiB', () => {
    expect(pipe.transform(1048576)).toBe('1 MiB');
  });

  it('should correctly transform GiB', () => {
    expect(pipe.transform(1073741824)).toBe('1 GiB');
  });

  it('should correctly transform TiB', () => {
    expect(pipe.transform(1099511627776)).toBe('1 TiB');
  });

  it('should correctly transform PiB', () => {
    expect(pipe.transform(1125899906842624)).toBe('1 PiB');
  });

  it('should correctly transform EiB', () => {
    expect(pipe.transform(1152921504606846976)).toBe('1 EiB');
  });

  it('should correctly transform ZiB', () => {
    expect(pipe.transform(1180591620717411303424)).toBe('1 ZiB');
  });

  it('should correctly transform YiB', () => {
    expect(pipe.transform(1208925819614629174706176)).toBe('1 YiB');
  });

  it('should correctly handle 0 Bytes', () => {
    expect(pipe.transform(0)).toBe('0 Bytes');
  });

  it('should correctly handle decimal places', () => {
    expect(pipe.transform(1500, 2)).toBe('1.46 KiB');
  });
});
