declare module 'react-simple-maps' {
    import { ComponentType, ReactNode, CSSProperties, MouseEvent } from 'react';

    export interface ComposableMapProps {
        projection?: string;
        projectionConfig?: {
            scale?: number;
            center?: [number, number];
            rotate?: [number, number, number];
        };
        width?: number;
        height?: number;
        style?: CSSProperties;
        children?: ReactNode;
    }

    export interface ZoomableGroupProps {
        center?: [number, number];
        zoom?: number;
        minZoom?: number;
        maxZoom?: number;
        onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
        onMoveStart?: (position: { coordinates: [number, number]; zoom: number }) => void;
        onMove?: (position: { coordinates: [number, number]; zoom: number }) => void;
        children?: ReactNode;
    }

    export interface GeographiesProps {
        geography: string | object;
        children: (data: { geographies: any[] }) => ReactNode;
    }

    export interface GeographyProps {
        geography: any;
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
        style?: {
            default?: CSSProperties;
            hover?: CSSProperties;
            pressed?: CSSProperties;
        };
        onMouseEnter?: (event: MouseEvent) => void;
        onMouseMove?: (event: MouseEvent) => void;
        onMouseLeave?: (event: MouseEvent) => void;
        onClick?: (event: MouseEvent) => void;
    }

    export interface MarkerProps {
        coordinates: [number, number];
        children?: ReactNode;
        style?: {
            default?: CSSProperties;
            hover?: CSSProperties;
            pressed?: CSSProperties;
        };
    }

    export interface LineProps {
        from: [number, number];
        to: [number, number];
        stroke?: string;
        strokeWidth?: number;
        strokeLinecap?: string;
    }

    export interface GraticuleProps {
        stroke?: string;
        strokeWidth?: number;
        step?: [number, number];
    }

    export interface SphereProps {
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
    }

    export const ComposableMap: ComponentType<ComposableMapProps>;
    export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
    export const Geographies: ComponentType<GeographiesProps>;
    export const Geography: ComponentType<GeographyProps>;
    export const Marker: ComponentType<MarkerProps>;
    export const Line: ComponentType<LineProps>;
    export const Graticule: ComponentType<GraticuleProps>;
    export const Sphere: ComponentType<SphereProps>;
}
