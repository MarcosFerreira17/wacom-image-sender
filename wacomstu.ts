class WacomSTU540 {
    private config: any;
    private command: any;
    private device: HIDDevice | null;
    private image: Uint8Array[] | null;

    constructor() {
        if (navigator?.hid == null) {
            throw new Error("WebHID is not supported.");
        }

        this.config = {
            chunkSize: 253,
            vid: 1386,
            pid: 168,
            imageFormat24BGR: 0x04,
            width: 800,
            height: 480,
            scaleFactor: 13.5,
            pressureFactor: 1023,
            refreshRate: 0,
            tabletWidth: 0,
            tabletHeight: 0,
            deviceName: null,
            firmware: null,
            eSerial: null,
            onPenDataCb: null,
            onHidChangeCb: null,
        };

        this.command = {
            penData: 0x01,
            information: 0x08,
            capability: 0x09,
            writingMode: 0x0E,
            eSerial: 0x0F,
            clearScreen: 0x20,
            inkMode: 0x21,
            writeImageStart: 0x25,
            writeImageData: 0x26,
            writeImageEnd: 0x27,
            writingArea: 0x2A,
            brightness: 0x2B,
            backgroundColor: 0x2E,
            penColorAndWidth: 0x2D,
            penDataTiming: 0x34,
        };

        this.device = null;
        this.image = null;
    }

    /**
     * Check if a compatible Wacom device is available.
     */
    public async checkAvailable(): Promise<boolean> {
        if (this.device && this.device.opened) return true;
        const devices = await navigator.hid.getDevices();
        return devices.some(device => device.vendorId === this.config.vid && device.productId === this.config.pid);
    }

    /**
     * Connect to the Wacom STU-540 device.
     */
    public async connect(): Promise<boolean> {
        if (this.device && this.device.opened) return true;

        const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: this.config.vid, productId: this.config.pid }] });
        if (!devices || devices.length === 0) return false;

        this.device = devices[0];

        await this.device.open();

        this.device.addEventListener("inputreport", this.handleInputReport.bind(this));

        const capabilities = await this.readData(this.command.capability);
        this.config.tabletWidth = capabilities.getUint16(1);
        this.config.tabletHeight = capabilities.getUint16(3);
        this.config.pressureFactor = capabilities.getUint16(5);
        this.config.scaleFactor = this.config.tabletWidth / this.config.width;

        const info = await this.readData(this.command.information);
        this.config.deviceName = this.dataViewToString(info, 1, 7);

        return true;
    }

    /**
     * Get the current tablet information.
     */
    public getTabletInfo(): any {
        if (!this.device || !this.device.opened) return null;
        return this.config;
    }

    /**
     * Set pen color and width.
     */
    public async setPenColorAndWidth(color: string, width: number): Promise<void> {
        if (!this.device || !this.device.opened) return;

        const colorArray = this.hexToRGB(color);
        colorArray.push(width);

        await this.sendData(this.command.penColorAndWidth, new Uint8Array(colorArray));
    }

    /**
     * Clear the screen of the tablet.
     */
    public async clearScreen(): Promise<void> {
        if (!this.device || !this.device.opened) return;
        await this.sendData(this.command.clearScreen, new Uint8Array([0]));
    }

    /**
     * Set the background color of the tablet.
     */
    public async setBackgroundColor(color: string): Promise<void> {
        if (!this.device || !this.device.opened) return;

        const colorArray = this.hexToRGB(color);
        await this.sendData(this.command.backgroundColor, new Uint8Array(colorArray));
    }

    /**
     * Send an image to the tablet.
     */
    public async setImage(imageData: Uint8Array): Promise<void> {
        if (!this.device || !this.device.opened || !imageData) return;

        this.image = this.splitToChunks(imageData, this.config.chunkSize);

        await this.sendData(this.command.writeImageStart, new Uint8Array([this.config.imageFormat24BGR]));

        for (const chunk of this.image) {
            await this.sendData(this.command.writeImageData, new Uint8Array(chunk));
        }

        await this.sendData(this.command.writeImageEnd, new Uint8Array([0]));
    }

    /**
     * Disconnect from the Wacom STU-540 device.
     */
    public async disconnect(): Promise<void> {
        if (this.device && this.device.opened) {
            await this.device.close();
        }
    }

    // Helper methods
    private handleInputReport(event: HIDInputReportEvent): void {
        if (event.reportId === this.command.penData && this.config.onPenDataCb) {
            const data = this.processPenData(event.data);
            this.config.onPenDataCb(data);
        }
    }

    private processPenData(data: DataView): any {
        const packet = {
            x: data.getUint16(2),
            y: data.getUint16(4),
            pressure: data.getUint16(0),
            isPenDown: (data.getUint8(0) & 1) !== 0,
        };
        return packet;
    }

    private async sendData(reportId: number, data: Uint8Array): Promise<void> {
        if (!this.device || !this.device.opened) return;
        await this.device.sendFeatureReport(reportId, data);
    }

    private async readData(reportId: number): Promise<DataView> {
        if (!this.device || !this.device.opened) return new DataView(new ArrayBuffer(0));
        const data = await this.device.receiveFeatureReport(reportId);
        return new DataView(data.buffer);
    }

    private hexToRGB(hex: string): number[] {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }

    private dataViewToString(dataView: DataView, offset: number, length: number): string {
        return String.fromCharCode.apply(null, new Uint8Array(dataView.buffer.slice(offset, offset + length)));
    }

    private splitToChunks(data: Uint8Array, chunkSize: number): Uint8Array[] {
        const chunks: Uint8Array[] = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }
}

export default WacomSTU540;
