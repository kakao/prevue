package prevue.render;

import com.android.tools.configurations.Configuration;
import com.android.tools.preview.ConfigurablePreviewElement;
import com.android.tools.preview.PreviewConfigurationKt;
import kotlin.jvm.functions.Function1;

/**
 * 렌더러 singlejar에 .kotlin_module이 없어 Kotlin이 최상위 함수 applyTo를 보지 못한다.
 * Java는 메타데이터 없이 파일 파사드를 부를 수 있어 여기로 우회한다.
 */
public final class Shim {
    private Shim() {}

    /** applyTo의 deviceProvider 기본값은 합성 $default 안의 싱글턴이라 javac가 못 본다. 리플렉션으로 집는다. */
    private static final Function1<Configuration, ?> DEFAULT_DEVICE_PROVIDER = defaultDeviceProvider();

    @SuppressWarnings("unchecked")
    private static Function1<Configuration, ?> defaultDeviceProvider() {
        try {
            Class<?> c = Class.forName("com.android.tools.preview.PreviewConfigurationKt$applyTo$1");
            java.lang.reflect.Field f = c.getField("INSTANCE");
            f.setAccessible(true); // 담고 있는 클래스가 package-private이라 접근권을 열어야 한다
            return (Function1<Configuration, ?>) f.get(null);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("렌더러 내부 구조가 바뀌었다 — applyTo 기본 deviceProvider를 찾지 못했다", e);
        }
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    public static void applyTo(ConfigurablePreviewElement element, Configuration configuration) {
        PreviewConfigurationKt.applyTo(element, configuration, (Function1) DEFAULT_DEVICE_PROVIDER);
    }
}
