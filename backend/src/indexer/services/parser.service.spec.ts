import { Test, TestingModule } from '@nestjs/testing';
import { ParserService } from './parser.service';
import { xdr, scValToNative } from '@stellar/stellar-sdk';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParserService],
    }).compile();

    service = module.get<ParserService>(ParserService);
    await service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse ScVal XDR correctly (using fallback or worker)', async () => {
    // Create a simple ScVal (string "hello")
    const scVal = xdr.ScVal.scvString('hello');
    const xdrString = scVal.toXDR('base64');

    const result = await service.parseScVal(xdrString);
    expect(result).toBe('hello');
  });

  it('should parse a batch of XDR strings', async () => {
    const xdrs = [
      xdr.ScVal.scvString('one').toXDR('base64'),
      xdr.ScVal.scvString('two').toXDR('base64'),
      xdr.ScVal.scvU32(123).toXDR('base64'),
    ];

    const results = await service.parseBatch(xdrs);
    expect(results).toEqual(['one', 'two', 123]);
  });

  it('should handle invalid XDR gracefully', async () => {
    const result = await service.parseScVal('invalid-xdr');
    expect(result).toHaveProperty('error');
  });
});
